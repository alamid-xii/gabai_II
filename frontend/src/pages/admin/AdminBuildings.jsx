import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  MapPin, Users, MessageSquare, FileText, BarChart3, Settings, LogOut,
  Bell, Search, TrendingUp, AlertCircle, CheckCircle2, Clock, Menu, X,
  Plus, Edit, Trash2, Eye, Building2, Home, Target, BookOpen,
  CheckCircle, XCircle, Download, Calendar, Filter, ChevronLeft, ChevronRight,
  UserPlus, Archive
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { AcademicSetup } from "../../components/admin/AcademicSetup";
import { SectionManagement } from "./SectionManagement";
import { useAuth } from "../../contexts/AuthContext";
import { API, BACKEND_URL } from "../../config/api";


import { AdminStatusBadge } from "./AdminShared";

export function AdminBuildings({ buildings, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    name: "", shortName: "", category: "Academic",
    description: "", offices: "", hours: "",
    pinX: "50", pinY: "50", imageUrl: "", color: "#102A71"
  });

  useEffect(() => {
    if (editingBuilding) {
      const coords = JSON.parse(editingBuilding.coordinates || '{"x":50,"y":50}');
      setFormData({
        name: editingBuilding.name || "",
        shortName: editingBuilding.shortName || "",
        category: editingBuilding.category || "Academic",
        description: editingBuilding.description || "",
        offices: Array.isArray(editingBuilding.offices)
          ? editingBuilding.offices.join(", ")
          : JSON.parse(editingBuilding.offices || '[]').join(", "),
        hours: editingBuilding.hours || "",
        pinX: String(coords.x ?? coords.pinX ?? 50),
        pinY: String(coords.y ?? coords.pinY ?? 50),
        imageUrl: editingBuilding.imageUrl || "",
        color: editingBuilding.color || "#102A71"
      });
      setPreviewUrl(editingBuilding.imageUrl ? `${BACKEND_URL}${editingBuilding.imageUrl}` : null);
      setSelectedFile(null);
    } else {
      setFormData({
        name: "", shortName: "", category: "Academic",
        description: "", offices: "", hours: "",
        pinX: "50", pinY: "50", imageUrl: "", color: "#102A71"
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [editingBuilding]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    
    // Use FormData for file upload
    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("shortName", formData.shortName);
    formDataToSend.append("category", formData.category);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("offices", JSON.stringify(formData.offices.split(',').map(o => o.trim()).filter(o => o)));
    formDataToSend.append("hours", formData.hours);
    formDataToSend.append("coordinates", JSON.stringify({ 
      x: parseFloat(formData.pinX), 
      y: parseFloat(formData.pinY) 
    }));
    formDataToSend.append("color", formData.color);
    
    // Add file if selected
    if (selectedFile) {
      formDataToSend.append("photo360", selectedFile);
    } else if (formData.imageUrl) {
      // Keep existing URL if no new file
      formDataToSend.append("imageUrl", formData.imageUrl);
    }

    try {
      const url = editingBuilding 
        ? `${API}/admin/buildings/${editingBuilding.id}`
        : `${API}/admin/buildings`;
      
      const response = await fetch(url, {
        method: editingBuilding ? "PUT" : "POST",
        headers: {
          "Authorization": `Bearer ${token}`
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        body: formDataToSend
      });

      if (response.ok) {
        setShowForm(false);
        setEditingBuilding(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error saving building:", error);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this building?")) return;
    
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API}/admin/buildings/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting building:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        <Button 
          onClick={() => {
            setShowForm(true);
            setEditingBuilding(null);
          }} 
          className="bg-[#001840] hover:bg-[#102A71]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Building
        </Button>
      </div>

      {/* Building Form */}
      {(showForm || editingBuilding) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Aerial Pin Picker Modal */}
            {showMapPicker && (
              <AerialPinPicker
                position={formData.pinX ? { x: parseFloat(formData.pinX), y: parseFloat(formData.pinY) } : null}
                onPositionChange={(pos) => {
                  setFormData({ ...formData, pinX: pos.x.toString(), pinY: pos.y.toString() });
                }}
                onClose={() => setShowMapPicker(false)}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Administration Building"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Short Name</label>
                  <Input
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="Admin Hall"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the building..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  >
                    <option>Administration</option>
                    <option>Academic</option>
                    <option>Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color (Hex)</label>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offices/Rooms (comma-separated)
                </label>
                <Input
                  value={formData.offices}
                  onChange={(e) => setFormData({ ...formData, offices: e.target.value })}
                  placeholder="Registrar's Office, Cashier, Guidance Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours</label>
                <Input
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="Mon-Fri: 8:00 AM - 5:00 PM"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Location on Campus Map
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="w-full px-4 py-3 bg-[#001840] hover:bg-[#102A71] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    {formData.pinX ? 'Reposition Pin on Aerial Photo' : 'Click to Pin Location on Aerial Photo'}
                  </button>
                  <div className="bg-[#FFFDF0] border border-[#F5C400]/30 rounded-lg p-3">
                    {formData.pinX && formData.pinY ? (
                      <p className="text-xs text-gray-600">
                        ✅ Pin placed at <span className="font-mono font-semibold text-[#001840]">x: {formData.pinX}%, y: {formData.pinY}%</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">No pin placed yet — click the button above to set location on the aerial photo</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  360° Panoramic Photo
                </label>
                
                {/* File Upload */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#F5C400] transition-colors text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <Plus className="w-8 h-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">
                            {selectedFile ? selectedFile.name : "Click to upload 360° photo"}
                          </p>
                          <p className="text-xs text-gray-500">
                            JPG, PNG up to 50MB
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Preview */}
                  {previewUrl && (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setFormData({ ...formData, imageUrl: "" });
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Upload an equirectangular 360° panoramic photo for interactive viewing
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-[#001840] hover:bg-[#102A71]">
                  {editingBuilding ? "Update Building" : "Create Building"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingBuilding(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Buildings Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((building) => (
          <Card key={building.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: building.color || "#001840" }}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{building.shortName}</h4>
                    <Badge className="mt-1">{building.category}</Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{building.description}</p>
              {building.imageUrl && (
                <div className="mb-3 text-xs text-green-600 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  360° Photo Available
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingBuilding(building);
                    setShowForm(false);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(building.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

