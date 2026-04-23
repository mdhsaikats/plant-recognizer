package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
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
	// 1. Get the file from the frontend request
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 2. Create a new multipart buffer to send to the AI service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Create a form file field named "file" (this is what FastAPI looks for)
	part, err := writer.CreateFormFile("file", fileHeader.Filename)
	if err != nil {
		http.Error(w, "Error creating form file", http.StatusInternalServerError)
		return
	}

	// Copy the uploaded file into the new form
	io.Copy(part, file)
	writer.Close() // Close the writer to finalize the multipart boundary

	// 3. Send the request to the AI service (assuming port 5000)
	req, err := http.NewRequest("POST", "http://localhost:5000/predict", body)
	if err != nil {
		http.Error(w, "AI request failed", http.StatusInternalServerError)
		return
	}

	// Set the correct Content-Type with the multipart boundary
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "AI Service Error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// 4. Decode the AI response
	var ai AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&ai); err != nil {
		http.Error(w, "Failed to decode AI response", http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"plant":      ai.Plant,
		"confidence": ai.Confidence,
		"status":     checkPlant(ai.Plant),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func main() {
	r := chi.NewRouter()

	// Inside main()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Adjust this for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

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
