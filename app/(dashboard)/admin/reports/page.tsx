'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  Briefcase,
  Image as ImageIcon,
  Filter,
} from 'lucide-react';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';

interface ProjectData {
  id: string;
  name: string;
  client: string;
  status: string;
  createdAt: string;
  daysSinceCreation: number;
  mockupCount: number;
  workflowName: string;
  hasWorkflow: boolean;
  totalStages: number;
  completedStages: number;
  reviewerCount: number;
}

interface UserReport {
  userId: string;
  userName: string;
  userEmail: string;
  projectCount: number;
  totalAssets: number;
  projects: ProjectData[];
}

interface ReportSummary {
  totalProjects: number;
  totalAssets: number;
  activeUsers: number;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function AdminReportsPage() {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [reportData, setReportData] = useState<UserReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalProjects: 0,
    totalAssets: 0,
    activeUsers: 0,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (organization?.id) {
      fetchReportData();
    }
  }, [organization?.id, statusFilter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports/projects?status=${statusFilter}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch report data';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: { reportData: [...], summary: {...} } }
      const fetchedReportData = result.data?.reportData || [];
      const fetchedSummary = result.data?.summary || { totalProjects: 0, totalAssets: 0, activeUsers: 0 };
      
      setReportData(fetchedReportData);
      setSummary(fetchedSummary);
    } catch (error) {
      console.error('Error fetching report data:', error);
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Generate CSV content
      const headers = ['User', 'Email', 'Project', 'Client', 'Status', 'Created', 'Days Old', 'Assets', 'Workflow', 'Progress', 'Reviewers'];
      const rows: string[][] = [headers];

      reportData.forEach((userReport) => {
        userReport.projects.forEach((project) => {
          const progress = project.hasWorkflow
            ? `${project.completedStages}/${project.totalStages}`
            : 'N/A';

          rows.push([
            userReport.userName,
            userReport.userEmail,
            project.name,
            project.client,
            project.status,
            new Date(project.createdAt).toLocaleDateString(),
            project.daysSinceCreation.toString(),
            project.mockupCount.toString(),
            project.workflowName,
            progress,
            project.reviewerCount.toString(),
          ]);
        });
      });

      // Convert to CSV string
      const csvContent = rows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `projects-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Import exceljs dynamically
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Projects Report');

      // Add title
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Projects Report - ${new Date().toLocaleDateString()}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add summary
      worksheet.mergeCells('A2:K2');
      const summaryCell = worksheet.getCell('A2');
      summaryCell.value = `Summary: ${summary.totalProjects} projects • ${summary.totalAssets} assets • ${summary.activeUsers} active users`;
      summaryCell.font = { size: 12 };
      summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add headers
      const headers = ['User', 'Email', 'Project', 'Client', 'Status', 'Created', 'Days Old', 'Assets', 'Workflow', 'Progress', 'Reviewers'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data
      reportData.forEach((userReport) => {
        userReport.projects.forEach((project, idx) => {
          const progress = project.hasWorkflow
            ? `${project.completedStages}/${project.totalStages}`
            : 'N/A';

          const row = worksheet.addRow([
            userReport.userName,
            userReport.userEmail,
            project.name,
            project.client,
            project.status,
            new Date(project.createdAt).toLocaleDateString(),
            project.daysSinceCreation,
            project.mockupCount,
            project.workflowName,
            progress,
            project.reviewerCount,
          ]);

          // Highlight first project of each user
          if (idx === 0) {
            row.font = { bold: true };
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0F0F0' }
            };
          }
        });
      });

      // Set column widths
      worksheet.columns.forEach((column, idx) => {
        const lengths = [headers[idx].length];
        worksheet.eachRow((row) => {
          const cell = row.getCell(idx + 1);
          if (cell.value) {
            lengths.push(cell.value.toString().length);
          }
        });
        column.width = Math.max(...lengths) + 2;
      });

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `projects-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Excel report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Failed to export Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <GmailLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Project Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              Export and analyze project data across your organization
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              {/* Filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Projects</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || loading || reportData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting || loading || reportData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Export Excel
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{summary.totalProjects}</div>
                    <div className="text-sm text-gray-600">Total Projects</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <ImageIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{summary.totalAssets}</div>
                    <div className="text-sm text-gray-600">Total Assets</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{summary.activeUsers}</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No projects found with the selected filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((userReport) => (
                      <>
                        {userReport.projects.map((project, idx) => (
                          <tr key={project.id} className={idx === 0 ? 'bg-gray-50' : ''}>
                            {idx === 0 && (
                              <td className="px-6 py-4 whitespace-nowrap" rowSpan={userReport.projects.length}>
                                <div className="text-sm font-medium text-gray-900">{userReport.userName}</div>
                                <div className="text-xs text-gray-500">{userReport.projectCount} projects • {userReport.totalAssets} assets</div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {project.client}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status as keyof typeof statusColors]}`}>
                                {project.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">{project.daysSinceCreation} days ago</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {project.mockupCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {project.workflowName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {project.hasWorkflow ? `${project.completedStages}/${project.totalStages} stages` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notifications */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </GmailLayout>
  );
}
