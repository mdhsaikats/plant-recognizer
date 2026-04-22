package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type AIResponse struct {
	Plant      string  `json:"plant"`
	Confidence float64 `json:"confidence"`
}

func checkPlant(name string) string {
	switch name {
	case "cannabis":
		return "Illegal 🚫"
	case "datura":
		return "Toxic ⚠️"
	default:
		return "Safe ✅"
	}
}

func analyzeHandler(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	body := &bytes.Buffer{}
	io.Copy(body, file)

	req, err := http.NewRequest("POST", "http://localhost:8080/predict", body)
	if err != nil {
		http.Error(w, "AI request failed", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/octet-stream")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Ai Service Error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var ai AIResponse
	json.NewDecoder(resp.Body).Decode(&ai)

	result := map[string]interface{}{
		"plant":      ai.Plant,
		"confidence": ai.Confidence,
		"status":     checkPlant(ai.Plant),
	}

	w.Header().Set("Conten-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func main() {
	r := chi.NewRouter()

	//middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	//routes
	r.Post("/analyze", analyzeHandler)

	err := http.ListenAndServe(":8080", r)
	if err != nil {
		fmt.Println("Error on server starting", err)
		return
	}
}
