import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumeContent } from "@applydesk/shared";

// DESIGN.md §11 — single column, black on white, no tables/icons/photos.
// Helvetica is one of the 14 standard PDF fonts: always embedded by the
// PDF spec itself (no font file to manage) and the safest choice for ATS
// parsers, which is exactly what §4.8 asks for.
//
// A resume is expected to fit one page. DESIGN.md's font/line-height range
// (10.5-11pt / 1.25-1.3) is the roomy default; render.ts re-renders at
// progressively tighter tiers (still fully legible print sizes) when a
// candidate's selected content doesn't fit at the default tier.
export interface ResumeCompaction {
  fontSize: number;
  lineHeight: number;
  margin: number;
  sectionSpacing: number;
  entrySpacing: number;
  contactSpacing: number;
  headingSpacing: number;
  bulletSpacing: number;
}

export const DEFAULT_COMPACTION: ResumeCompaction = {
  fontSize: 10.5,
  lineHeight: 1.3,
  margin: 54,
  sectionSpacing: 10,
  entrySpacing: 8,
  contactSpacing: 14,
  headingSpacing: 6,
  bulletSpacing: 3,
};

// Each tier is still a normal, legible print size (9pt is standard for
// dense one-page resumes) — only tried when the roomier tiers overflow.
export const COMPACTION_TIERS: ResumeCompaction[] = [
  DEFAULT_COMPACTION,
  {
    fontSize: 10,
    lineHeight: 1.22,
    margin: 46,
    sectionSpacing: 8,
    entrySpacing: 6,
    contactSpacing: 12,
    headingSpacing: 5,
    bulletSpacing: 2.5,
  },
  {
    fontSize: 9.5,
    lineHeight: 1.16,
    margin: 40,
    sectionSpacing: 7,
    entrySpacing: 5,
    contactSpacing: 10,
    headingSpacing: 4,
    bulletSpacing: 2,
  },
  {
    fontSize: 9,
    lineHeight: 1.1,
    margin: 34,
    sectionSpacing: 6,
    entrySpacing: 4,
    contactSpacing: 9,
    headingSpacing: 3,
    bulletSpacing: 1.5,
  },
];

function buildStyles(c: ResumeCompaction) {
  return StyleSheet.create({
    page: {
      paddingTop: c.margin,
      paddingBottom: c.margin,
      paddingHorizontal: c.margin,
      fontFamily: "Helvetica",
      fontSize: c.fontSize,
      lineHeight: c.lineHeight,
      color: "#000000",
    },
    name: {
      fontSize: c.fontSize + 8.5,
      fontFamily: "Helvetica-Bold",
      // A fixed, tight lineHeight (not the page's inherited multiplier) plus
      // a real marginBottom — react-pdf under-reserves vertical space for a
      // large one-off font size stacked right above smaller text otherwise,
      // and the next line renders overlapping the name's descender.
      lineHeight: 1.15,
      marginBottom: 6,
    },
    contactLine: {
      fontSize: c.fontSize - 1,
      marginBottom: c.contactSpacing,
      color: "#333333",
    },
    section: {
      marginTop: c.sectionSpacing,
    },
    sectionHeading: {
      fontSize: c.fontSize + 0.5,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 1,
      borderBottomWidth: 0.75,
      borderBottomColor: "#000000",
      paddingBottom: 2,
      marginBottom: c.headingSpacing,
    },
    summaryText: {
      fontSize: c.fontSize,
    },
    entry: {
      marginBottom: c.entrySpacing,
    },
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    // A long title (a publication title, a cert name + issuer) must wrap
    // onto a second line without sliding under the date column — flex: 1
    // reserves the date's width up front, before wrapping is calculated, so
    // a wrapped second line never renders past that boundary. Without this,
    // react-pdf lets the wrapping text run the full row width and the fixed
    // date ends up overlapping the wrapped line.
    entryTitleLine: {
      fontFamily: "Helvetica-Bold",
      flex: 1,
      paddingRight: 10,
    },
    entryDates: {
      fontSize: c.fontSize - 1,
      color: "#333333",
      flexShrink: 0,
    },
    bulletRow: {
      flexDirection: "row",
      marginTop: c.bulletSpacing,
    },
    bulletMark: {
      width: 10,
    },
    bulletText: {
      flex: 1,
    },
    skillsText: {
      fontSize: c.fontSize,
    },
    skillGroupRow: {
      flexDirection: "row",
      marginTop: c.bulletSpacing,
    },
    skillGroupLabel: {
      fontFamily: "Helvetica-Bold",
      width: 110,
    },
    skillGroupText: {
      flex: 1,
    },
    projectDescription: {
      marginTop: 2,
    },
  });
}

function formatDateRange(startDate: string, endDate: string | undefined, current: boolean): string {
  return `${startDate} – ${current ? "Present" : (endDate ?? "")}`;
}

export function ResumePdf({
  content,
  compaction = DEFAULT_COMPACTION,
}: {
  content: ResumeContent;
  compaction?: ResumeCompaction;
}) {
  const styles = buildStyles(compaction);
  const contactParts = [
    content.contactLocation,
    content.contactEmail,
    content.contactPhone,
    content.contactLinkedin,
    content.contactGithub,
    content.contactPortfolio,
  ].filter((part): part is string => !!part);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{content.contactFullName}</Text>
        {contactParts.length > 0 && <Text style={styles.contactLine}>{contactParts.join(" · ")}</Text>}

        {content.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Summary</Text>
            <Text style={styles.summaryText}>{content.summary}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Experience</Text>
          {content.experiences.map((exp) => (
            <View key={exp.id} style={styles.entry} wrap={false}>
              <View style={styles.entryHeaderRow}>
                <Text style={styles.entryTitleLine}>
                  {exp.title}
                  {exp.company ? `, ${exp.company}` : ""}
                  {exp.location ? ` — ${exp.location}` : ""}
                </Text>
                <Text style={styles.entryDates}>{formatDateRange(exp.startDate, exp.endDate, exp.current)}</Text>
              </View>
              {exp.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletMark}>•</Text>
                  <Text style={styles.bulletText}>{bullet.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {content.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Projects</Text>
            {content.projects.map((project) => (
              <View key={project.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitleLine}>{project.name}</Text>
                  {(project.startDate || project.endDate) && (
                    <Text style={styles.entryDates}>
                      {[project.startDate, project.endDate].filter(Boolean).join(" – ")}
                    </Text>
                  )}
                </View>
                {project.description && (
                  <Text style={styles.projectDescription}>{project.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {content.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            {content.skillGroups.length > 0 ? (
              content.skillGroups.map((group) => (
                <View key={group.category} style={styles.skillGroupRow}>
                  <Text style={styles.skillGroupLabel}>{group.category}</Text>
                  <Text style={styles.skillGroupText}>{group.skills.join(" · ")}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.skillsText}>{content.skills.join(" · ")}</Text>
            )}
          </View>
        )}

        {content.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            {content.education.map((edu) => (
              <View key={edu.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitleLine}>
                    {edu.degree}
                    {edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""} — {edu.school}
                  </Text>
                  {(edu.startDate || edu.endDate) && (
                    <Text style={styles.entryDates}>
                      {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {content.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Certifications</Text>
            {content.certifications.map((cert) => (
              <View key={cert.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitleLine}>
                    {cert.name}
                    {cert.issuer ? ` — ${cert.issuer}` : ""}
                  </Text>
                  {cert.date && <Text style={styles.entryDates}>{cert.date}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {content.publications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Publications</Text>
            {content.publications.map((pub) => (
              <View key={pub.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryTitleLine}>
                    {pub.title}
                    {pub.publisher ? ` — ${pub.publisher}` : ""}
                  </Text>
                  {pub.date && <Text style={styles.entryDates}>{pub.date}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
