import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 45,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#d9a72a',
    paddingBottom: 8,
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  companyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d9a72a',
  },
  companySubtitle: {
    fontSize: 7,
    color: '#64748b',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  reportMeta: {
    alignItems: 'flex-end',
  },
  batchNameTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d9a72a',
  },
  generationDate: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterColumn: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 6,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 8,
    color: '#d9a72a',
    fontWeight: 'bold',
  },
  scheduleSection: {
    borderWidth: 1,
    borderColor: 'rgba(217, 167, 42, 0.15)',
    backgroundColor: 'rgba(217, 167, 42, 0.02)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scheduleColumn: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 6,
    color: '#d9a72a',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 8,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  statusCompleted: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#10b981',
  },
  statusActive: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statusOther: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#d9a72a',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 6,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  kashSection: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  kashTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  kashRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  kashItem: {
    alignItems: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  kashItemLast: {
    alignItems: 'center',
    flex: 1,
  },
  kashLabel: {
    fontSize: 6,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kashValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chartsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  chartWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  chartTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
    textAlign: 'center',
  },
  chartImage: {
    width: '100%',
    height: 100,
    objectFit: 'contain',
  },
  topPerformersSection: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
  },
  topPerformersTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  topPerformersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  performerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    width: '31%',
  },
  performerRank: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#d9a72a',
    marginRight: 4,
  },
  performerName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#334155',
    flex: 1,
  },
  performerScore: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#d9a72a',
  },
  table: {
    width: '100%',
    marginTop: 4,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#d9a72a',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeadText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  rowTextBold: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  rowTextMuted: {
    fontSize: 6,
    color: '#64748b',
    marginTop: 1,
  },
  badgeCompleted: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgeInProgress: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgeOther: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgePassed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    textAlign: 'center',
  },
  badgeFailed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: 6,
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageNumberText: {
    fontSize: 6,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  colName: { flex: 2 },
  colDept: { flex: 1.5 },
  colRole: { flex: 1.5 },
  colStatus: { flex: 1, alignItems: 'flex-start' },
  colScore: { flex: 0.8, textAlign: 'right' },
  colCourseTitle: { flex: 2.5 },
  colCompRate: { flex: 1, textAlign: 'center' },
  colQuizScore: { flex: 1, textAlign: 'center' },
  colActScore: { flex: 1, textAlign: 'center' },
  colOverallScore: { flex: 1, textAlign: 'right' }
});

interface BatchReportPDFProps {
  batchName: string;
  logoUrl: string;
  data: any;
  filters: {
    departmentId: string;
    role: string;
    status: string;
  };
  departments: any[];
  charts: {
    prePost: string | null;
    statusDist: string | null;
    kash: string | null;
  };
}

export const BatchReportPDF: React.FC<BatchReportPDFProps> = ({
  batchName,
  logoUrl,
  data,
  filters,
  departments,
  charts,
}) => {
  const activeDeptName =
    filters.departmentId === 'all'
      ? 'All Departments'
      : departments.find((d) => d.id === filters.departmentId)?.name || 'Filtered Department';

  const activeRole =
    filters.role === 'all' ? 'All Roles' : filters.role.replace('_', ' ');

  const activeStatus =
    filters.status === 'all' ? 'All Statuses' : filters.status.replace('_', ' ');

  // Chunk array helper
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  const learnerChunks = data.learnerDetails ? chunkArray(data.learnerDetails, 16) : [[]];
  const courseChunks = data.courseDetails ? chunkArray(data.courseDetails, 12) : [[]];

  const getStatusStyle = (status: string) => {
    if (status === 'COMPLETED') return styles.statusCompleted;
    if (status === 'ACTIVE') return styles.statusActive;
    return styles.statusOther;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') return <Text style={styles.badgeCompleted}>Completed</Text>;
    if (status === 'IN_PROGRESS') return <Text style={styles.badgeInProgress}>In Progress</Text>;
    return <Text style={styles.badgeOther}>{status.replace('_', ' ')}</Text>;
  };

  const getResultBadge = (result: string) => {
    if (result === 'Passed') return <Text style={styles.badgePassed}>Passed</Text>;
    if (result === 'Failed') return <Text style={styles.badgeFailed}>Failed</Text>;
    return <Text style={styles.badgeOther}>{result}</Text>;
  };

  return (
    <Document>
      {/* PAGE 1: Overview & KPIs */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.companyTitle}>Standard Insurance Co., Inc.</Text>
              <Text style={styles.companySubtitle}>iLearn Portal • Executive Batch Analytics Report</Text>
            </View>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.batchNameTitle}>{batchName}</Text>
            <Text style={styles.generationDate}>
              Generated: {format(new Date(), 'MMMM dd, yyyy • hh:mm a')}
            </Text>
          </View>
        </View>

        {/* Filters Summary */}
        <View style={styles.filterSection}>
          <View style={styles.filterColumn}>
            <Text style={styles.filterLabel}>Department Filter</Text>
            <Text style={styles.filterValue}>{activeDeptName}</Text>
          </View>
          <View style={styles.filterColumn}>
            <Text style={styles.filterLabel}>Role Filter</Text>
            <Text style={[styles.filterValue, { textTransform: 'capitalize' }]}>{activeRole.toLowerCase()}</Text>
          </View>
          <View style={styles.filterColumn}>
            <Text style={styles.filterLabel}>Status Filter</Text>
            <Text style={[styles.filterValue, { textTransform: 'capitalize' }]}>{activeStatus.toLowerCase()}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleColumn}>
            <Text style={styles.scheduleLabel}>Start Date</Text>
            <Text style={styles.scheduleValue}>
              {format(new Date(data.startDate), 'MMMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.scheduleColumn}>
            <Text style={styles.scheduleLabel}>End Date</Text>
            <Text style={styles.scheduleValue}>
              {format(new Date(data.endDate), 'MMMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.scheduleColumn}>
            <Text style={styles.scheduleLabel}>Batch Status</Text>
            <Text style={getStatusStyle(data.status)}>
              {data.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Section 1: KPIs */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sectionHeading}>1. Batch Overview & KPIs</Text>
          <View style={styles.kpiContainer}>
            <View style={[styles.kpiCard, { backgroundColor: 'rgba(217, 167, 42, 0.05)', borderColor: 'rgba(217, 167, 42, 0.15)' }]}>
              <Text style={[styles.kpiLabel, { color: '#d9a72a' }]}>Total Enrolled</Text>
              <Text style={[styles.kpiValue, { color: '#d9a72a' }]}>{data.totalLearners}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
              <Text style={[styles.kpiLabel, { color: '#15803d' }]}>Completion Rate</Text>
              <Text style={[styles.kpiValue, { color: '#15803d' }]}>{data.completionRate}%</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: 'rgba(217, 167, 42, 0.05)', borderColor: 'rgba(217, 167, 42, 0.15)' }]}>
              <Text style={[styles.kpiLabel, { color: '#d9a72a' }]}>Avg Activity Score</Text>
              <Text style={[styles.kpiValue, { color: '#d9a72a' }]}>{data.averageScore}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: '#f0f9ff', borderColor: '#e0f2fe' }]}>
              <Text style={[styles.kpiLabel, { color: '#0369a1' }]}>Avg Post Quiz Score</Text>
              <Text style={[styles.kpiValue, { color: '#0369a1' }]}>{data.knowledgeDelta?.postQuizAvg || 0}</Text>
            </View>
          </View>
        </View>

        {/* KASH metrics */}
        {data.kashMetrics && data.kashMetrics.length > 0 && (
          <View style={styles.kashSection}>
            <Text style={styles.kashTitle}>K.A.S.H. Performance Breakdown</Text>
            <View style={styles.kashRow}>
              {data.kashMetrics.map((m: any, idx: number) => {
                const isLast = idx === data.kashMetrics.length - 1;
                return (
                  <View key={idx} style={isLast ? styles.kashItemLast : styles.kashItem}>
                    <Text style={styles.kashLabel}>{m.domain}</Text>
                    <Text style={styles.kashValue}>{m.score}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Section 2: Chart Images */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sectionHeading}>2. Chart Visualizations</Text>
          <View style={styles.chartsGrid}>
            <View style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>
                Pre vs Post Quiz (Gain: {data.knowledgeDelta?.percentageIncrease >= 0 ? '+' : ''}{data.knowledgeDelta?.percentageIncrease || 0}%)
              </Text>
              {charts.prePost ? (
                <Image src={charts.prePost} style={styles.chartImage} />
              ) : (
                <View style={[styles.chartImage, { backgroundColor: '#f8fafc', justifyContent: 'center' }]} />
              )}
            </View>
            <View style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>Status Distribution</Text>
              {charts.statusDist ? (
                <Image src={charts.statusDist} style={styles.chartImage} />
              ) : (
                <View style={[styles.chartImage, { backgroundColor: '#f8fafc', justifyContent: 'center' }]} />
              )}
            </View>
            <View style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>Overall K.A.S.H.</Text>
              {charts.kash ? (
                <Image src={charts.kash} style={styles.chartImage} />
              ) : (
                <View style={[styles.chartImage, { backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 8 }]}>
                  <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center', fontWeight: 'bold' }}>Evaluation Pending</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Section 3: Top Performers */}
        {data.topPerformers && data.topPerformers.length > 0 && (
          <View style={styles.topPerformersSection}>
            <Text style={styles.topPerformersTitle}>Top Performers</Text>
            <View style={styles.topPerformersGrid}>
              {data.topPerformers.map((performer: any, i: number) => (
                <View key={i} style={styles.performerCard}>
                  <Text style={styles.performerRank}>#{i + 1}</Text>
                  <Text style={styles.performerName} numberOfLines={1}>
                    {performer.name}
                  </Text>
                  <Text style={styles.performerScore}>{performer.averageScore}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Confidential • iLearn Portal Analytics Engine</Text>
          <Text style={styles.pageNumberText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 2+: Learner breakdown (paginated/chunked) */}
      {learnerChunks.map((chunk, chunkIdx) => (
        <Page key={`learner-page-${chunkIdx}`} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
              <View>
                <Text style={styles.companyTitle}>Standard Insurance Co., Inc.</Text>
                <Text style={styles.companySubtitle}>iLearn Portal • Executive Batch Analytics Report</Text>
              </View>
            </View>
            <View style={styles.reportMeta}>
              <Text style={styles.batchNameTitle}>{batchName}</Text>
              <Text style={styles.generationDate}>Learner Breakdown (Part {chunkIdx + 1} of {learnerChunks.length})</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>3. Learner Performance Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <View style={styles.colName}><Text style={styles.tableHeadText}>Name</Text></View>
              <View style={styles.colDept}><Text style={styles.tableHeadText}>Department</Text></View>
              <View style={styles.colRole}><Text style={styles.tableHeadText}>Role</Text></View>
              <View style={styles.colStatus}><Text style={styles.tableHeadText}>Status</Text></View>
              <View style={styles.colScore}><Text style={[styles.tableHeadText, { textAlign: 'right' }]}>Avg Score</Text></View>
            </View>

            {chunk.map((l: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.colName}>
                  <Text style={styles.rowTextBold}>{l.name}</Text>
                </View>
                <View style={styles.colDept}>
                  <Text style={styles.rowTextBold}>{l.department}</Text>
                </View>
                <View style={styles.colRole}>
                  <Text style={[styles.rowTextBold, { textTransform: 'capitalize' }]}>
                    {l.role.toLowerCase().replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.colStatus}>
                  {getStatusBadge(l.status)}
                </View>
                <View style={styles.colScore}>
                  <Text style={[styles.rowTextBold, { color: '#d9a72a', textAlign: 'right' }]}>
                    {l.averageScore}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Confidential • iLearn Portal Analytics Engine</Text>
            <Text style={styles.pageNumberText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      ))}

      {/* PAGE 3+: Course breakdown (paginated/chunked) */}
      {courseChunks.map((chunk, chunkIdx) => (
        <Page key={`course-page-${chunkIdx}`} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
              <View>
                <Text style={styles.companyTitle}>Standard Insurance Co., Inc.</Text>
                <Text style={styles.companySubtitle}>iLearn Portal • Executive Batch Analytics Report</Text>
              </View>
            </View>
            <View style={styles.reportMeta}>
              <Text style={styles.batchNameTitle}>{batchName}</Text>
              <Text style={styles.generationDate}>Course Breakdown (Part {chunkIdx + 1} of {courseChunks.length})</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>4. Course Insights & Metrics</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <View style={styles.colCourseTitle}><Text style={styles.tableHeadText}>Course Title</Text></View>
              <View style={styles.colCompRate}><Text style={[styles.tableHeadText, { textAlign: 'center' }]}>Completion</Text></View>
              <View style={styles.colQuizScore}><Text style={[styles.tableHeadText, { textAlign: 'center' }]}>Quiz Avg</Text></View>
              <View style={styles.colActScore}><Text style={[styles.tableHeadText, { textAlign: 'center' }]}>Activity Avg</Text></View>
              <View style={styles.colOverallScore}><Text style={[styles.tableHeadText, { textAlign: 'right' }]}>Overall Avg</Text></View>
            </View>

            {chunk.map((c: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.colCourseTitle}>
                  <Text style={styles.rowTextBold}>{c.title}</Text>
                  <Text style={styles.rowTextMuted}>
                    Schedule: {format(new Date(c.startDate), 'MMM dd, yyyy')} - {format(new Date(c.endDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <View style={styles.colCompRate}>
                  <Text style={[styles.rowTextBold, { textAlign: 'center' }]}>{c.completionRate}%</Text>
                </View>
                <View style={styles.colQuizScore}>
                  <Text style={[styles.rowTextBold, { textAlign: 'center' }]}>{c.avgQuizScore}</Text>
                </View>
                <View style={styles.colActScore}>
                  <Text style={[styles.rowTextBold, { textAlign: 'center' }]}>{c.avgActivityScore}</Text>
                </View>
                <View style={styles.colOverallScore}>
                  <Text style={[styles.rowTextBold, { color: '#d9a72a', textAlign: 'right' }]}>
                    {c.averageScore}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Confidential • iLearn Portal Analytics Engine</Text>
            <Text style={styles.pageNumberText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
};
