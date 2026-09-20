import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = {
  getToken: () => localStorage.getItem("auth_token"),
  getUserEmail: () => localStorage.getItem("auth_email"),
  
  setAuth: (token, email) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_email", email);
  },

  clearAuth: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_email");
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearAuth();
      window.dispatchEvent(new Event("auth-changed"));
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      let errDetail = "Request failed";
      try {
        const data = await response.json();
        errDetail = data.detail || JSON.stringify(data);
      } catch (e) {
        errDetail = response.statusText;
      }
      throw new Error(errDetail);
    }

    return response.json();
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    api.setAuth(data.access_token, email);
    window.dispatchEvent(new Event("auth-changed"));
    return data;
  },

  register: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed");
    }
    const data = await res.json();
    api.setAuth(data.access_token, email);
    window.dispatchEvent(new Event("auth-changed"));
    return data;
  },

  getDocuments: () => api.request("/documents"),

  uploadDocument: async (file) => {
    const token = api.getToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  deleteDocument: async (documentId) => {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok && res.status !== 204) {
      throw new Error("Failed to delete document");
    }
    return true;
  },

  triggerProcessing: (documentId) =>
    api.request(`/documents/${documentId}/process`, { method: "POST" }),

  getJobStatus: (documentId) => api.request(`/documents/${documentId}/status`),

  getQuestions: (documentId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/documents/${documentId}/questions${query ? `?${query}` : ""}`);
  },

  getAnswers: (questionId) => api.request(`/questions/${questionId}/answers`),

  getWarnings: (questionId) => api.request(`/questions/${questionId}/warnings`),
};
