#!/usr/bin/env python3
"""
PRANOVA Healthcare Coordination Platform - User Guide PDF Generator
Compiles an executive-grade, production-aligned PDF User Guide into docs/PRANOVA_User_Guide.pdf
using ReportLab.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    PageBreak,
    HRFlowable,
)
from reportlab.pdfgen import canvas

# ----------------------------------------------------------------------
# Brand Design Palette
# ----------------------------------------------------------------------
PRIMARY = HexColor("#0B6E6E")       # PRANOVA Medical Teal
PRIMARY_DARK = HexColor("#084E4E")  # Dark Teal
SECONDARY = HexColor("#0F172A")     # Slate Dark
TEXT_DARK = HexColor("#1E293B")     # Charcoal body text
TEXT_MUTED = HexColor("#64748B")    # Slate muted text
SURFACE_LIGHT = HexColor("#F8FAFC") # Soft off-white surface
BORDER_COLOR = HexColor("#E2E8F0")  # Soft subtle border
ACCENT_BLUE = HexColor("#0284C7")   # Sky blue
SUCCESS_GREEN = HexColor("#059669") # Emerald success
WARNING_AMBER = HexColor("#D97706") # Amber warning
DANGER_RED = HexColor("#DC2626")    # Crimson danger
WHITE = HexColor("#FFFFFF")

# ----------------------------------------------------------------------
# Numbered Canvas for Dynamic "Page X of Y" Headers & Footers
# ----------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Cover page has custom layout, skip running header/footer
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(PRIMARY)
        self.drawString(54, 752, "PRANOVA HEALTHCARE PLATFORM")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        self.drawString(200, 752, "•   Client Operations & Administration Guide")
        self.drawRightString(558, 752, "v2.0 (Production Release)")

        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.75)
        self.line(54, 744, 558, 744)

        # Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "CONFIDENTIAL  •  Prepared for client operations. Not for unauthorized distribution.")
        self.drawRightString(558, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=TEXT_MUTED,
        spaceAfter=24,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        "BodyDarkBold",
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=SECONDARY,
    )

    table_header = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=WHITE,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK,
    )

    code_style = ParagraphStyle(
        "CodeText",
        fontName="Courier",
        fontSize=8.5,
        leading=11,
        textColor=HexColor("#0F172A"),
    )

    story = []

    # ==================================================================
    # PAGE 1: COVER PAGE
    # ==================================================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("PRANOVA", title_style))
    story.append(
        Paragraph(
            "Healthcare Coordination Platform & Clinical Operations Engine",
            subtitle_style,
        )
    )

    # Decorative colored horizontal bar
    story.append(HRFlowable(width="100%", thickness=3, color=PRIMARY, spaceBefore=0, spaceAfter=20))

    # Meta card table
    meta_data = [
        [Paragraph("<b>Document</b>", table_cell_bold), Paragraph("Client Operations & Administration User Guide", table_cell)],
        [Paragraph("<b>Version</b>", table_cell_bold), Paragraph("2.0 (Production Release)", table_cell)],
        [Paragraph("<b>Date</b>", table_cell_bold), Paragraph("October 2026", table_cell)],
        [Paragraph("<b>Audience</b>", table_cell_bold), Paragraph("Platform Administrators, Operations Supervisors, Clinical Coordinators", table_cell)],
        [Paragraph("<b>Architecture</b>", table_cell_bold), Paragraph("Strictly Headless API-First, MySQL 8 / Prisma, React-Admin v5", table_cell)],
        [Paragraph("<b>Deployment</b>", table_cell_bold), Paragraph("Production Single-Container (Railway, Docker, Cloud VMs)", table_cell)],
        [Paragraph("<b>Classification</b>", table_cell_bold), Paragraph("CONFIDENTIAL — Prepared for client operations. Not for public distribution.", table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[110, 394])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SURFACE_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 30))

    # Executive Overview Callout
    overview_text = (
        "<b>Executive Overview:</b> PRANOVA provides an enterprise healthcare operating system connecting "
        "Central Administrators, Patients, Field Care Managers, and Healthcare Providers. This document "
        "provides comprehensive operational guidance for managing clinician rosters, appointments, "
        "online pharmacy orders, diagnostic pathology tests, and emergency SOS cases."
    )
    callout_data = [[Paragraph(overview_text, callout_style)]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F0FDFA")),
            ("BOX", (0, 0), (-1, -1), 1, HexColor("#99F6E4")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ])
    )
    story.append(callout_table)
    story.append(PageBreak())

    # ==================================================================
    # PAGE 2: ARCHITECTURE & SYSTEM OVERVIEW
    # ==================================================================
    story.append(Paragraph("1. Welcome to PRANOVA", h1_style))
    story.append(
        Paragraph(
            "PRANOVA is an enterprise-grade, headless, API-first healthcare coordination platform. "
            "A single robust Node.js Express backend engine connects three distinct user surfaces:",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Central Admin Web Console:</b> A high-density clinical administration portal built with "
            "React-Admin v5 and Material-UI v5 for operators, supervisors, and clinical coordinators.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Patient Mobile App:</b> A native React Native (Expo) consumer application for doctor "
            "discovery, appointments, medicine orders, lab tests, and emergency SOS dispatching.",
            bullet_style,
        )
    )
    story.append(
        Paragraph(
            "• <b>Care Manager Mobile App:</b> A native React Native (Expo) field application for clinical "
            "officers managing encounters, accepting emergency triage, and updating case timelines.",
            bullet_style,
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("2. Production Architecture & Technology Stack", h1_style))
    story.append(
        Paragraph(
            "The platform is locked onto standard, enterprise technologies designed for high reliability, "
            "strict referential integrity, and sub-millisecond query execution:",
            body_style,
        )
    )

    stack_data = [
        [Paragraph("Layer", table_header), Paragraph("Technology", table_header), Paragraph("Production Specification", table_header)],
        [Paragraph("Database", table_cell_bold), Paragraph("MySQL 8.0+ / MariaDB", table_cell), Paragraph("Port 3306 (pranova_db) with Prisma ORM & strict foreign keys", table_cell)],
        [Paragraph("Backend API", table_cell_bold), Paragraph("Node.js / Express / TypeScript", table_cell), Paragraph("RESTful JSON APIs (/api/v1/*) with Zod request validation", table_cell)],
        [Paragraph("Real-Time", table_cell_bold), Paragraph("Socket.IO Engine", table_cell), Paragraph("Bidirectional emergency telemetry & audio dispatch alerts", table_cell)],
        [Paragraph("Admin Console", table_cell_bold), Paragraph("React-Admin v5 (Vite + MUI)", table_cell), Paragraph("Served directly by Express in production from / and /admin", table_cell)],
        [Paragraph("Mobile Apps", table_cell_bold), Paragraph("React Native (Expo SDK 57)", table_cell), Paragraph("Native mobile apps consuming dedicated /app/* and /cm/* APIs", table_cell)],
    ]
    stack_table = Table(stack_data, colWidths=[90, 160, 254])
    stack_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(stack_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("Unified Single-Container Serving", h2_style))
    story.append(
        Paragraph(
            "In production, the backend server automatically detects and serves the compiled React-Admin "
            "bundle at <code>/</code> and <code>/admin</code>. This enables single-origin deployment without "
            "CORS issues or the need for separate frontend hosting servers. The same container provides "
            "the REST API, WebSockets, and the operational Web Console.",
            body_style,
        )
    )
    story.append(PageBreak())

    # ==================================================================
    # PAGE 3: ACCESSING ADMIN CONSOLE & DASHBOARD
    # ==================================================================
    story.append(Paragraph("3. Accessing the Admin Console", h1_style))
    story.append(
        Paragraph(
            "Administrators access the central console through any standard modern web browser:",
            body_style,
        )
    )
    story.append(Paragraph("• <b>Local / Dedicated Server:</b> <code>http://localhost:5000/</code> or <code>/admin</code>", bullet_style))
    story.append(Paragraph("• <b>Railway / Cloud Hosting:</b> Your generated cloud domain (e.g. <code>https://pranova-production.up.railway.app</code>)", bullet_style))

    story.append(Spacer(1, 6))
    creds_data = [
        [Paragraph("Parameter", table_header), Paragraph("Default Value", table_header), Paragraph("Configuration Note", table_header)],
        [Paragraph("Super Admin Email", table_cell_bold), Paragraph("admin@pranova.com", table_cell), Paragraph("Configurable via ADMIN_EMAIL in .env", table_cell)],
        [Paragraph("Default Password", table_cell_bold), Paragraph("Admin@123456", table_cell), Paragraph("Configurable via ADMIN_PASSWORD in .env", table_cell)],
        [Paragraph("Landing View", table_cell_bold), Paragraph("#/dashboard", table_cell), Paragraph("Command Center Operations Dashboard", table_cell)],
    ]
    creds_table = Table(creds_data, colWidths=[120, 160, 224])
    creds_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(creds_table)

    story.append(Spacer(1, 14))
    story.append(Paragraph("4. The Command Center Dashboard", h1_style))
    story.append(
        Paragraph(
            "The <b>Command Center</b> (<code>#/dashboard</code>) delivers real-time operational telemetry across "
            "the entire healthcare ecosystem. Each metric tile functions as an interactive gateway to its resource:",
            body_style,
        )
    )

    kpi_data = [
        [Paragraph("Metric Tile", table_header), Paragraph("Clinical / Operational Meaning", table_header), Paragraph("Target Action", table_header)],
        [Paragraph("Revenue (GMV)", table_cell_bold), Paragraph("Total combined revenue across consultations, pharmacy, and lab tests.", table_cell), Paragraph("Monitors platform commercial health", table_cell)],
        [Paragraph("Active Doctors", table_cell_bold), Paragraph("Total clinicians currently accepting patient appointments.", table_cell), Paragraph("Onboard or update clinician rosters", table_cell)],
        [Paragraph("Appointments", table_cell_bold), Paragraph("Total booked visits, highlighting today's scheduled consultations.", table_cell), Paragraph("Review pending appointment confirmations", table_cell)],
        [Paragraph("Pharmacy Orders", table_cell_bold), Paragraph("Total prescription orders with active fulfillment count.", table_cell), Paragraph("Process packing and dispatching", table_cell)],
        [Paragraph("Lab Bookings", table_cell_bold), Paragraph("Diagnostic tests awaiting sample collection or report release.", table_cell), Paragraph("Upload verified PDF laboratory reports", table_cell)],
        [Paragraph("Registered Patients", table_cell_bold), Paragraph("Total verified patient profiles in the clinical directory.", table_cell), Paragraph("Inspect clinical history & allergies", table_cell)],
        [Paragraph("Active Cases", table_cell_bold), Paragraph("Emergency SOS and clinical cases requiring care coordinator action.", table_cell), Paragraph("Immediate field care manager triage", table_cell)],
    ]
    kpi_table = Table(kpi_data, colWidths=[110, 240, 154])
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(kpi_table)
    story.append(PageBreak())

    # ==================================================================
    # PAGE 4: CLINICAL CONSULTATIONS & APPOINTMENTS
    # ==================================================================
    story.append(Paragraph("5. Managing Specialties & Doctors", h1_style))
    story.append(
        Paragraph(
            "<b>5.1 Specialties Catalog (<code>#/specialties</code>):</b> Configure medical specialties browsed by patients "
            "in the mobile app (e.g. Cardiology, Pediatrics, General Medicine, Dermatology, Orthopedics). "
            "Each specialty carries an icon, title, and description.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>5.2 Doctor Directory (<code>#/doctors</code>):</b> Manage clinician credentials and availability: "
            "<br/>• <b>Profile:</b> Full name, medical qualifications (MBBS, MD), registration license, years of experience, languages, and biography."
            "<br/>• <b>Consultation Fees:</b> Separate pricing for in-clinic visits and virtual teleconsultations."
            "<br/>• <b>Availability Slots:</b> Configure weekly recurring consultation hours, consultation duration, and room type."
            "<br/>• <b>Status:</b> Switch clinician between <code>ACTIVE</code>, <code>ON_LEAVE</code>, and <code>INACTIVE</code>.",
            body_style,
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("6. Appointments & Video Teleconsultations", h1_style))
    story.append(
        Paragraph(
            "The appointment engine coordinates in-clinic and video consultations through a verified lifecycle:",
            body_style,
        )
    )

    appt_data = [
        [Paragraph("Status", table_header), Paragraph("Workflow Stage & Operational Meaning", table_header), Paragraph("Actor Responsible", table_header)],
        [Paragraph("REQUESTED", table_cell_bold), Paragraph("Patient booked a consultation slot via the mobile app.", table_cell), Paragraph("Patient / System", table_cell)],
        [Paragraph("CONFIRMED", table_cell_bold), Paragraph("Slot approved; encrypted video room automatically generated for teleconsults.", table_cell), Paragraph("System / Admin", table_cell)],
        [Paragraph("IN_PROGRESS", table_cell_bold), Paragraph("Clinician and patient are actively conducting consultation.", table_cell), Paragraph("Doctor / Coordinator", table_cell)],
        [Paragraph("COMPLETED", table_cell_bold), Paragraph("Consultation concluded; prescription and clinical notes uploaded.", table_cell), Paragraph("Doctor / Coordinator", table_cell)],
        [Paragraph("CANCELLED", table_cell_bold), Paragraph("Appointment cancelled before start time.", table_cell), Paragraph("Patient / Admin", table_cell)],
        [Paragraph("NO_SHOW", table_cell_bold), Paragraph("Patient failed to attend scheduled in-clinic or video session.", table_cell), Paragraph("Doctor / Coordinator", table_cell)],
    ]
    appt_table = Table(appt_data, colWidths=[90, 280, 134])
    appt_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(appt_table)

    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "<b>Secure Video Rooms:</b> For teleconsultations, PRANOVA issues an encrypted video room link. "
            "Both patient and clinician enter with signed tokens, ensuring privacy compliance under DPDP and HIPAA.",
            callout_style,
        )
    )
    story.append(PageBreak())

    # ==================================================================
    # PAGE 5: PHARMACY & DIAGNOSTIC WORKFLOWS
    # ==================================================================
    story.append(Paragraph("7. Online Pharmacy & Medicine Logistics", h1_style))
    story.append(
        Paragraph(
            "<b>7.1 Medicine Catalog (<code>#/medicines</code>):</b> Add brand and generic pharmaceuticals with dosage forms "
            "(Tablets, Syrups, Injections, Ointments), strengths, retail MRP, and prescription requirements.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>7.2 Order Fulfillment Pipeline (<code>#/orders</code>):</b> Orders progress through a 5-stage dispatch pipeline:",
            body_style,
        )
    )

    order_data = [
        [Paragraph("Order Status", table_header), Paragraph("Fulfillment Action Required", table_header), Paragraph("Automated Operations", table_header)],
        [Paragraph("PLACED", table_cell_bold), Paragraph("Order submitted by patient; prescription attached if required.", table_cell), Paragraph("Inventory reserved; server calculates totals.", table_cell)],
        [Paragraph("CONFIRMED", table_cell_bold), Paragraph("Pharmacist verifies prescription and accepts order.", table_cell), Paragraph("Payment captured / COD authorized.", table_cell)],
        [Paragraph("PACKED", table_cell_bold), Paragraph("Medications boxed with invoice and batch verification.", table_cell), Paragraph("Dispatch label generated.", table_cell)],
        [Paragraph("OUT_FOR_DELIVERY", table_cell_bold), Paragraph("Order assigned to courier fleet for doorstep delivery.", table_cell), Paragraph("Patient receives dispatch notification.", table_cell)],
        [Paragraph("DELIVERED", table_cell_bold), Paragraph("Courier confirms delivery at patient physical address.", table_cell), Paragraph("Order marked completed and paid.", table_cell)],
        [Paragraph("CANCELLED", table_cell_bold), Paragraph("Order rejected or cancelled by administrator.", table_cell), Paragraph("Reserved inventory returned to catalog.", table_cell)],
    ]
    order_table = Table(order_data, colWidths=[110, 220, 174])
    order_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(order_table)

    story.append(Spacer(1, 12))
    story.append(Paragraph("8. Diagnostics & Laboratory Bookings", h1_style))
    story.append(
        Paragraph(
            "<b>8.1 Test Catalog (<code>#/diagnostic-tests</code>):</b> Pathology panels (CBC, Lipid Profile, HbA1c, etc.) "
            "with fasting guidelines, sample types (Blood, Urine, Swab), and turnaround hours.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>8.2 Lab Booking Workflow (<code>#/lab-bookings</code>):</b> Patients choose Home Collection or Lab Visit:",
            body_style,
        )
    )

    lab_data = [
        [Paragraph("Status", table_header), Paragraph("Investigation Stage", table_header), Paragraph("Clinical Responsibility", table_header)],
        [Paragraph("BOOKED", table_cell_bold), Paragraph("Patient booked diagnostic package via mobile app.", table_cell), Paragraph("Phlebotomist scheduled for dispatch", table_cell)],
        [Paragraph("SAMPLE_COLLECTED", table_cell_bold), Paragraph("Specimen collected from patient and barcoded.", table_cell), Paragraph("Phlebotomist / Collection Center", table_cell)],
        [Paragraph("PROCESSING", table_cell_bold), Paragraph("Laboratory analyzers conducting biochemical analysis.", table_cell), Paragraph("Pathology Laboratory Technician", table_cell)],
        [Paragraph("REPORT_READY", table_cell_bold), Paragraph("Certified clinical PDF report attached to booking.", table_cell), Paragraph("Released to patient mobile app", table_cell)],
        [Paragraph("CANCELLED", table_cell_bold), Paragraph("Investigation cancelled prior to specimen collection.", table_cell), Paragraph("Patient / Administrator", table_cell)],
    ]
    lab_table = Table(lab_data, colWidths=[110, 230, 164])
    lab_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(lab_table)
    story.append(PageBreak())

    # ==================================================================
    # PAGE 6: EMERGENCY SOS & CARE COORDINATION
    # ==================================================================
    story.append(Paragraph("9. Emergency SOS Cases & Field Triage", h1_style))
    story.append(
        Paragraph(
            "When a patient triggers the emergency <b>SOS Button</b> in their mobile app:",
            body_style,
        )
    )
    story.append(Paragraph("1. An immutable <b>P1 Emergency Case</b> is created with exact GPS coordinates and physical street address.", bullet_style))
    story.append(Paragraph("2. The backend broadcasts a real-time <code>admin:new_emergency</code> event over WebSockets.", bullet_style))
    story.append(Paragraph("3. The Admin Console sounds an audible chime and displays the <b>Emergency Dispatch Modal</b>.", bullet_style))
    story.append(Paragraph("4. The dispatcher reviews the triage map, acknowledges the incident, and assigns a field Care Manager.", bullet_style))

    story.append(Spacer(1, 6))
    priority_data = [
        [Paragraph("Priority", table_header), Paragraph("Clinical Severity & Criteria", table_header), Paragraph("SLA & Protocol", table_header)],
        [Paragraph("P1 — Critical", table_cell_bold), Paragraph("Acute life threat (chest tightness, dyspnea, stroke symptoms, major trauma).", table_cell), Paragraph("Immediate field triage dispatch (< 5 mins)", table_cell)],
        [Paragraph("P2 — Urgent", table_cell_bold), Paragraph("Severe unstable symptoms (high fever, severe abdominal pain, post-op crisis).", table_cell), Paragraph("Field clinical response (< 30 mins)", table_cell)],
        [Paragraph("P3 — Standard", table_cell_bold), Paragraph("Routine care coordination, medication review, post-discharge check-in.", table_cell), Paragraph("Scheduled care manager encounter", table_cell)],
    ]
    priority_table = Table(priority_data, colWidths=[90, 250, 164])
    priority_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(priority_table)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Interactive Location Link with OpenStreetMap", h2_style))
    story.append(
        Paragraph(
            "All incident locations, clinic addresses, and delivery addresses render through <code>LocationLink</code>. "
            "Clicking an address opens an interactive OpenStreetMap dialog showing the exact geographic pin, "
            "with one-click links to Google Maps and OpenStreetMap navigation directions.",
            body_style,
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("10. Patient & Provider Registries", h1_style))
    story.append(
        Paragraph(
            "• <b>Patients (<code>#/patients</code>):</b> Complete patient registry with blood group, documented allergies, "
            "emergency contacts, linked family members, and clinical documents.<br/>"
            "• <b>Care Managers (<code>#/care-managers</code>):</b> Field healthcare officers with assigned zones, active case "
            "counts, and contact hotlines.<br/>"
            "• <b>Providers (<code>#/providers</code>):</b> Network of certified Hospitals, Clinics, Diagnostic Labs, Pharmacies, "
            "and Ambulance fleets with GPS mapping.",
            body_style,
        )
    )
    story.append(PageBreak())

    # ==================================================================
    # PAGE 7: DOCUMENTS, BRANDING & CLOUD DEPLOYMENT
    # ==================================================================
    story.append(Paragraph("11. Clinical Document Management", h1_style))
    story.append(
        Paragraph(
            "The document subsystem (<code>#/documents</code>) securely manages prescriptions, lab test reports, "
            "and discharge summaries. Documents are accessed via signed token endpoints with automatic "
            "content-type detection and verified clinical PDF previews.",
            body_style,
        )
    )

    story.append(Spacer(1, 8))
    story.append(Paragraph("12. Platform Branding & Runtime Settings", h1_style))
    story.append(
        Paragraph(
            "Administrators customize the platform runtime via <b>Settings</b> (<code>#/settings</code>) without code modifications:",
            body_style,
        )
    )
    story.append(Paragraph("• <b>Application Name & Tagline:</b> Displayed on the browser title bar, login portal, and AppBar.", bullet_style))
    story.append(Paragraph("• <b>Primary Brand Color:</b> Controls AppBar styling, primary action buttons, and status chips.", bullet_style))
    story.append(Paragraph("• <b>Logo & Favicon URLs:</b> Custom image assets for your healthcare organization.", bullet_style))
    story.append(Paragraph("• <b>Support Contact:</b> Official support email and 24/7 emergency dispatch hotline numbers.", bullet_style))

    story.append(Spacer(1, 8))
    story.append(Paragraph("13. Production Cloud Deployment (Railway & Docker)", h1_style))
    story.append(
        Paragraph(
            "PRANOVA includes zero-config production deployment specifications for cloud container platforms:",
            body_style,
        )
    )

    deploy_data = [
        [Paragraph("Step", table_header), Paragraph("Railway / Cloud Action", table_header), Paragraph("Automated Platform Execution", table_header)],
        [Paragraph("1. Connect Repo", table_cell_bold), Paragraph("Connect GitHub repo to Railway project.", table_cell), Paragraph("Nixpacks detects Node.js & railway.json.", table_cell)],
        [Paragraph("2. Add MySQL", table_cell_bold), Paragraph("Add managed MySQL 8 database service.", table_cell), Paragraph("Railway sets DATABASE_URL variable automatically.", table_cell)],
        [Paragraph("3. Build", table_cell_bold), Paragraph("npm run build", table_cell), Paragraph("Compiles backend TypeScript & React-Admin Vite UI.", table_cell)],
        [Paragraph("4. Start", table_cell_bold), Paragraph("npm start", table_cell), Paragraph("Syncs Prisma schema and boots server on port 5000.", table_cell)],
        [Paragraph("5. Live Demo", table_cell_bold), Paragraph("Open generated public Railway domain.", table_cell), Paragraph("Admin Console loads immediately at root URL.", table_cell)],
    ]
    deploy_table = Table(deploy_data, colWidths=[90, 200, 214])
    deploy_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(deploy_table)
    story.append(PageBreak())

    # ==================================================================
    # PAGE 8: CHECKLIST & SUPPORT
    # ==================================================================
    story.append(Paragraph("Appendix A — First-Login Operational Checklist", h1_style))
    story.append(
        Paragraph(
            "Follow this operational verification checklist when launching a fresh PRANOVA deployment:",
            body_style,
        )
    )

    checklist_items = [
        ("1. Sign In", "Access the console with admin@pranova.com / Admin@123456."),
        ("2. Update Security", "Navigate to Administrators and update the default password."),
        ("3. Set Branding", "Configure organization name, brand color, and support email in Settings."),
        ("4. Verify Specialties", "Confirm standard medical categories (Cardiology, Dermatology, etc.) exist."),
        ("5. Onboard Doctors", "Add clinicians with qualifications, consultation fees, and weekly slots."),
        ("6. Review Catalog", "Verify pharmaceuticals in the Medicine Catalog and laboratory tests in Diagnostics."),
        ("7. Confirm Dashboard", "Verify the Command Center dashboard displays active metrics and charts."),
    ]
    for title, desc in checklist_items:
        story.append(Paragraph(f"<b>[ ✓ ] {title}:</b> {desc}", bullet_style))

    story.append(Spacer(1, 14))
    story.append(Paragraph("Appendix B — Support & Engineering Assistance", h1_style))
    story.append(
        Paragraph(
            "For technical support, custom clinical workflows, or cloud infrastructure assistance:",
            body_style,
        )
    )

    support_data = [
        [Paragraph("Channel", table_header), Paragraph("Contact & Access Details", table_header)],
        [Paragraph("GitHub Repository", table_cell_bold), Paragraph("https://github.com/Aman-Kumar-roy/pranova", table_cell)],
        [Paragraph("Support Email", table_cell_bold), Paragraph("support@pranova.health / engineering@pranova.com", table_cell)],
        [Paragraph("API Documentation", table_cell_bold), Paragraph("Interactive OpenAPI Explorer at /api-docs (when enabled)", table_cell)],
        [Paragraph("Licensing", table_cell_bold), Paragraph("MIT Open Source License", table_cell)],
    ]
    support_table = Table(support_data, colWidths=[140, 364])
    support_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(support_table)

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=0, spaceAfter=12))
    story.append(
        Paragraph(
            "<i>© 2026 PRANOVA Healthcare Coordination Platform. All rights reserved. "
            "Prepared strictly for client operations. Confidential.</i>",
            ParagraphStyle("FooterNote", fontName="Helvetica", fontSize=8, textColor=TEXT_MUTED, alignment=1),
        )
    )

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Compiled PRANOVA User Guide PDF: {output_path}")


if __name__ == "__main__":
    out_dir = os.path.join(os.getcwd(), "docs")
    os.makedirs(out_dir, exist_ok=True)
    pdf_dest = os.path.join(out_dir, "PRANOVA_User_Guide.pdf")
    build_pdf(pdf_dest)
