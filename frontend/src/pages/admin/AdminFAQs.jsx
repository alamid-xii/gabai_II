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


import { AdminStatusBadge } from "./AdminShared";

export function AdminFAQs({ faqs, onDelete, onEdit, onAdd, editingFAQ, showForm, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "Requirements",
    keywords: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    if (editingFAQ) {
      setFormData({
        question: editingFAQ.question,
        answer: editingFAQ.answer,
        category: editingFAQ.category,
        keywords: JSON.parse(editingFAQ.keywords || '[]').join(', ')
      });
    } else {
      setFormData({ question: "", answer: "", category: "Requirements", keywords: "" });
    }
  }, [editingFAQ]);

  // Filter FAQs based on search query
  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredFAQs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFAQs = filteredFAQs.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      ...formData,
      keywords: JSON.stringify(formData.keywords.split(',').map(k => k.trim()).filter(k => k))
    };
    
    if (editingFAQ) {
      onSave(editingFAQ.id, data);
    } else {
      onSave(data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div></div>
        <Button onClick={onAdd} className="bg-[#001840] hover:bg-[#102A71]">
          <Plus className="w-4 h-4 mr-2" />
          Add New FAQ
        </Button>
      </div>

      {/* Search Bar */}
      {!showForm && !editingFAQ && (
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search FAQs by question, answer, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {filteredFAQs.length} of {faqs.length} FAQs
          </div>
        </div>
      )}

      {(showForm || editingFAQ) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingFAQ ? "Edit FAQ" : "Create New FAQ"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What are the admission requirements?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a detailed answer..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                >
                  <option>Requirements</option>
                  <option>Deadlines</option>
                  <option>Programs</option>
                  <option>Enrollment</option>
                  <option>Location</option>
                  <option>Fees</option>
                  <option>Financial Aid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords (comma-separated)
                </label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="admission, requirements, documents"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-[#001840] hover:bg-[#102A71]">
                  {editingFAQ ? "Update FAQ" : "Create FAQ"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {currentFAQs.length > 0 ? (
        <>
          <div className="grid gap-4">
            {currentFAQs.map((faq) => (
              <Card key={faq.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{faq.category}</Badge>
                        <span className="text-xs text-gray-500">
                          {faq.views} views • {faq.helpful} helpful
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(faq)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit FAQ"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onDelete(faq.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredFAQs.length)} of {filteredFAQs.length} FAQs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            currentPage === page
                              ? "bg-[#001840] text-white"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? "No FAQs found" : "No FAQs yet"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Get started by creating your first FAQ"}
            </p>
            {!searchQuery && (
              <Button onClick={onAdd} className="bg-[#001840] hover:bg-[#102A71]">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First FAQ
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

