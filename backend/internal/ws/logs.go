package ws

import (
	"bufio"
	"net/http"
	"strings"

	"github.com/dockerpanel/backend/internal/docker"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type LogMessage struct {
	Type string `json:"type"` // stdout, stderr
	Data string `json:"data"`
}

func HandleContainerLogs(c *gin.Context) {
	containerID := c.Param("cid")
	tail := c.DefaultQuery("tail", "100")
	follow := c.Query("follow") == "true"

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

	reader, err := client.ContainerLogs(containerID, tail, follow)
	if err != nil {
		wsConn.WriteJSON(gin.H{"error": err.Error()})
		return
	}
	defer reader.Close()

	// Docker multiplexes stdout/stderr with an 8-byte header
	// For simplicity, we stream raw bytes and let frontend handle ANSI
	scanner := bufio.NewScanner(reader)
	scanner.Split(scanDockerLog)

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) > 8 {
			// Strip docker stream header
			msg := data[8:]
			wsConn.WriteMessage(websocket.TextMessage, msg)
		} else if len(data) > 0 {
			wsConn.WriteMessage(websocket.TextMessage, data)
		}
	}
}

// scanDockerLog splits by lines but preserves the docker multiplex header
func scanDockerLog(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	if i := strings.Index(string(data), "\n"); i >= 0 {
		return i + 1, data[0 : i+1], nil
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}
