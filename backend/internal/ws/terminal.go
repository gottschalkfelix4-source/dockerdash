package ws

import (
	"encoding/json"

	"github.com/dockerpanel/backend/internal/docker"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type TerminalResize struct {
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

func HandleTerminal(c *gin.Context) {
	containerID := c.Param("cid")

	client, err := docker.NewDockerClient()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer client.Close()

	wsConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer wsConn.Close()

	// Create exec with TTY
	execID, err := client.ExecCreate(containerID, []string{"/bin/sh"})
	if err != nil {
		// Fallback to bash
		execID, err = client.ExecCreate(containerID, []string{"/bin/bash"})
		if err != nil {
			wsConn.WriteJSON(gin.H{"error": err.Error()})
			return
		}
	}

	// Resize to reasonable defaults
	client.ExecResize(execID, 24, 80)

	resp, err := client.ExecAttach(execID)
	if err != nil {
		wsConn.WriteJSON(gin.H{"error": err.Error()})
		return
	}
	defer resp.Close()

	// Read from docker exec -> write to websocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := resp.Reader.Read(buf)
			if n > 0 {
				wsConn.WriteMessage(websocket.BinaryMessage, buf[:n])
			}
			if err != nil {
				break
			}
		}
	}()

	// Read from websocket -> write to docker exec
	for {
		msgType, data, err := wsConn.ReadMessage()
		if err != nil {
			break
		}
		if msgType == websocket.TextMessage {
			// Check if it's a resize command
			var resize TerminalResize
			if json.Unmarshal(data, &resize) == nil && resize.Cols > 0 && resize.Rows > 0 {
				client.ExecResize(execID, uint(resize.Rows), uint(resize.Cols))
				continue
			}
			resp.Conn.Write(data)
		} else if msgType == websocket.BinaryMessage {
			resp.Conn.Write(data)
		}
	}
}
