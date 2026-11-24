import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
} from "lucide-react";
import { usePortalSlot } from "../../hooks/usePortalSlot";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const FAQ_CATEGORIES = [
  "Requirements",
  "Deadlines",
  "Programs",
  "Enrollment",
  "Location",
  "Fees",
  "Financial Aid",
];

const CATEGORY_BADGES = {
  Requirements: "bg-blue-100 text-blue-700 border-blue-200",
  Deadlines: "bg-amber-100 text-amber-800 border-amber-200",
  Programs: "bg-purple-100 text-purple-700 border-purple-200",
  Enrollment: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Location: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Fees: "bg-rose-100 text-rose-700 border-rose-200",
  "Financial Aid": "bg-teal-100 text-teal-700 border-teal-200",
};

function parseKeywords(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
}

export function AdminFAQs({ faqs = [], onDelete, onEdit, onAdd, editingFAQ, showForm, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "Requirements",
    keywords: "",
  });
  const [prevEditingFAQ, setPrevEditingFAQ] = useState(editingFAQ);
  if (prevEditingFAQ !== editingFAQ) {
    setPrevEditingFAQ(editingFAQ);
    setFormData(
      editingFAQ
        ? {
            question: editingFAQ.question || "",
            answer: editingFAQ.answer || "",
            category: editingFAQ.category || "Requirements",
            keywords: parseKeywords(editingFAQ.keywords).join(", "),
          }
        : { question: "", answer: "", category: "Requirements", keywords: "" }
    );
  }
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFAQ, setPreviewFAQ] = useState(null);
  const itemsPerPage = 10;

  const headerContainer = usePortalSlot(
    "admin-header-slot",
    true,
    "flex items-center justify-end gap-2 flex-wrap ml-auto"
  );

  const activeFAQs = useMemo(
    () => faqs.filter((faq) => faq.isActive !== false && faq.isActive !== 0),
    [faqs]
  );

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeFAQs.filter((faq) => {
      if (categoryFilter !== "all" && faq.category !== categoryFilter) return false;
      if (!q) return true;
      const kw = parseKeywords(faq.keywords).join(" ").toLowerCase();
      return (
        (faq.question || "").toLowerCase().includes(q) ||
        (faq.answer || "").toLowerCase().includes(q) ||
        (faq.category || "").toLowerCase().includes(q) ||
        kw.includes(q)
      );
    });
  }, [activeFAQs, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFAQs.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFAQs = filteredFAQs.slice(startIndex, endIndex);

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      ...formData,
      keywords: JSON.stringify(
        formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      ),
    };

    if (editingFAQ) {
      onSave(editingFAQ.id, data);
    } else {
      onSave(data);
    }
  }

  const addBtn = (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#001840] text-white text-sm font-semibold hover:bg-[#102A71] transition-colors shadow-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      Add New FAQ
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header Slot Action or Fallback */}
      {headerContainer ? (
        createPortal(addBtn, headerContainer)
      ) : (
        <div className="flex justify-end">{addBtn}</div>
      )}

      {/* Create / Edit FAQ Modal */}
      {(showForm || editingFAQ) && (
        <div
          className="fixed inset-0 z-50 bg-[#001840]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={onCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#001840]">
                  {editingFAQ ? "Edit FAQ" : "Add New FAQ"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingFAQ
                    ? "Update the question, answer, category, or keywords for this FAQ."
                    : "Create a new FAQ entry for the GabAI chatbot knowledge base."}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-[#001840] mb-1.5">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="What are the admission requirements?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#001840] mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  >
                    {FAQ_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#001840] mb-1.5">
                  Answer <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Provide a clear and detailed answer for students..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#001840] mb-1.5">
                  Keywords (comma-separated) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="admission, requirements, documents, form 138"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Separate keywords with commas to help the chatbot match student questions.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#001840] hover:bg-[#102A71]">
                  {editingFAQ ? "Update FAQ" : "Create FAQ"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Category Filter Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search FAQs by question, answer, category, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter FAQs by category"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
          >
            <option value="all">All Categories ({activeFAQs.length})</option>
            {FAQ_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({activeFAQs.filter((f) => f.category === cat).length})
              </option>
            ))}
          </select>

          <div className="text-xs font-semibold text-gray-500 whitespace-nowrap self-center px-1">
            {filteredFAQs.length} of {activeFAQs.length} FAQs
          </div>
        </div>
      </div>

      {/* FAQs Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {currentFAQs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {[
                      "#",
                      "Question & Answer",
                      "Category",
                      "Keywords",
                      "Engagement",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                          header === "Actions" ? "text-right" : "text-left"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentFAQs.map((faq, idx) => {
                    const keywords = parseKeywords(faq.keywords);
                    const catBadge =
                      CATEGORY_BADGES[faq.category] ||
                      "bg-gray-100 text-gray-700 border-gray-200";

                    return (
                      <tr
                        key={faq.id}
                        onClick={() => setPreviewFAQ(faq)}
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        {/* Row Number */}
                        <td className="px-4 py-3.5 text-xs font-semibold text-gray-400 whitespace-nowrap">
                          {startIndex + idx + 1}
                        </td>

                        {/* Question & Answer */}
                        <td className="px-4 py-3.5 max-w-md">
                          <p className="font-semibold text-[#001840] text-sm leading-snug">
                            {faq.question}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {faq.answer}
                          </p>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catBadge}`}
                          >
                            {faq.category || "General"}
                          </span>
                        </td>

                        {/* Keywords */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {keywords.slice(0, 4).map((kw, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium"
                              >
                                {kw}
                              </span>
                            ))}
                            {keywords.length > 4 && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[11px] font-medium">
                                +{keywords.length - 4}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Engagement (Views & Helpful) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1" title="Views">
                              <Eye size={13} className="text-gray-400" />
                              {faq.views || 0}
                            </span>
                            <span className="inline-flex items-center gap-1" title="Helpful votes">
                              <ThumbsUp size={13} className="text-emerald-600" />
                              {faq.helpful || 0}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3.5 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewFAQ(faq)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[#001840] hover:bg-gray-100 transition-colors"
                              title="View FAQ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(faq)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit FAQ"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(faq.id)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete FAQ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-[#001840]">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-[#001840]">
                  {Math.min(endIndex, filteredFAQs.length)}
                </span>{" "}
                of <span className="font-semibold text-[#001840]">{filteredFAQs.length}</span> FAQs
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-[#001840] hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs font-semibold text-[#001840] px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-[#001840] hover:bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 px-4 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              {searchQuery || categoryFilter !== "all"
                ? "No FAQs match your filters"
                : "No custom FAQs added yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search query or category filter."
                : "Add custom FAQs here to expand what the GabAI chatbot can answer for students and visitors."}
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFAQ && (
        <div
          className="fixed inset-0 z-50 bg-[#001840]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewFAQ(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2 ${
                    CATEGORY_BADGES[previewFAQ.category] ||
                    "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {previewFAQ.category}
                </span>
                <h3 className="text-lg font-bold text-[#001840]">{previewFAQ.question}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFAQ(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {previewFAQ.answer}
            </div>

            {parseKeywords(previewFAQ.keywords).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parseKeywords(previewFAQ.keywords).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                {previewFAQ.views || 0} views • {previewFAQ.helpful || 0} helpful
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = previewFAQ;
                    setPreviewFAQ(null);
                    onEdit(target);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#001840] hover:bg-[#102A71]"
                  onClick={() => setPreviewFAQ(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

