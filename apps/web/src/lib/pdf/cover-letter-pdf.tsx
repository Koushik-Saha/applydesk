import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";
import type { CoverLetterContent } from "@applydesk/shared";

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 54,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.3,
    color: "#000000",
  },
  name: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  contactLine: {
    fontSize: 9.5,
    marginBottom: 20,
    color: "#333333",
  },
  date: {
    marginBottom: 10,
  },
  company: {
    marginBottom: 14,
  },
  greeting: {
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 10,
  },
  signOff: {
    marginTop: 6,
  },
});

export interface CoverLetterCandidateInfo {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

// DESIGN.md §11 — "same header block as the resume, date, company,
// greeting, 3-4 paragraphs, signature line."
export function CoverLetterPdf({
  content,
  candidate,
  company,
  date,
}: {
  content: CoverLetterContent;
  candidate: CoverLetterCandidateInfo;
  company: string;
  date: string;
}) {
  const contactParts = [
    candidate.location,
    candidate.email,
    candidate.phone,
    candidate.linkedin,
    candidate.github,
    candidate.portfolio,
  ].filter((part): part is string => !!part);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{candidate.fullName}</Text>
        {contactParts.length > 0 && <Text style={styles.contactLine}>{contactParts.join(" · ")}</Text>}

        <Text style={styles.date}>{date}</Text>
        {company && <Text style={styles.company}>{company}</Text>}
        <Text style={styles.greeting}>{content.greeting}</Text>

        {content.paragraphs.map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        <Text style={styles.signOff}>{content.signOff}</Text>
      </Page>
    </Document>
  );
}
