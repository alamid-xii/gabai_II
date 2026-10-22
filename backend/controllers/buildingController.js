/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import { Building } from "../models/buildingModel.js";
import { sequelize } from "../models/db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (buildingController):", err.message); }

// Configure multer for 360° photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../public/uploads/360photos");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "building-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for 360° photos
});

export const getAllBuildings = async (req, res) => {
  try {
    const buildings = await Building.findAll({ where: { isActive: true } });
    res.json(buildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ error: "Failed to fetch buildings" });
  }
};

export const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);
    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }
    res.json(building);
  } catch (error) {
    console.error("Error fetching building:", error);
    res.status(500).json({ error: "Failed to fetch building" });
  }
};

export const createBuilding = async (req, res) => {
  try {
    const buildingData = { ...req.body };
    
    // If a file was uploaded, set the imageUrl to the file path
    if (req.file) {
      buildingData.imageUrl = `/uploads/360photos/${req.file.filename}`;
    }
    
    const building = await Building.create(buildingData);
    res.status(201).json(building);
  } catch (error) {
    console.error("Error creating building:", error);
    res.status(500).json({ error: "Failed to create building" });
  }
};

export const updateBuilding = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);
    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }
    
    const updateData = { ...req.body };
    
    // If a new file was uploaded, update the imageUrl
    if (req.file) {
      updateData.imageUrl = `/uploads/360photos/${req.file.filename}`;
      
      // Delete old image if it exists
      if (building.imageUrl && building.imageUrl.startsWith("/uploads/")) {
        const oldImagePath = path.join(__dirname, "../public", building.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    await building.update(updateData);
    res.json(building);
  } catch (error) {
    console.error("Error updating building:", error);
    res.status(500).json({ error: "Failed to update building" });
  }
};

export const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findByPk(req.params.id);
    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }
    
    // Delete associated image file if it exists
    if (building.imageUrl && building.imageUrl.startsWith("/uploads/")) {
      const imagePath = path.join(__dirname, "../public", building.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await building.update({ isActive: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting building:", error);
    res.status(500).json({ error: "Failed to delete building" });
  }
};
