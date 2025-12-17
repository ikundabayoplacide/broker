"use client";

import { useState } from "react";
import { X, FileText, Download, Calendar } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  title: string;
  availableFields: { key: string; label: string }[];
  format: 'pdf' | 'word';
}

export interface ReportConfig {
  format: 'pdf' | 'word';
  startDate: string;
  endDate: string;
  selectedFields: string[];
}

export default function ReportModal({ isOpen, onClose, onGenerate, title, availableFields, format }: ReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(['fullName', 'email', 'phone', 'role']);

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleGenerate = () => {
    if (!startDate || !endDate || selectedFields.length === 0) return;
    
    onGenerate({
      format,
      startDate,
      endDate,
      selectedFields
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#004B5B]">Generate {title} Report</h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">


            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004B5B]/20 focus:border-[#004B5B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004B5B]/20 focus:border-[#004B5B]"
                  />
                </div>
              </div>
            </div>

            {/* Field Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Fields to Include</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => handleFieldToggle(field.key)}
                      className="rounded border-gray-300 text-[#004B5B] focus:ring-[#004B5B]"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => setSelectedFields(availableFields.map(f => f.key))}
                  className="text-sm text-[#004B5B] hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedFields([])}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!startDate || !endDate || selectedFields.length === 0}
              className="bg-[#004B5B] hover:bg-[#006B85] flex  items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate {format.toUpperCase()} Report
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}