import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withPermission } from "@/lib/middleware/withPermission";
import { MODULES } from "@/lib/permissions";

// GET - Fetch calendar events (matches /api/admin/calendar)
// GET - Fetch calendar events (matches /api/admin/calendar)
async function handleGet(request, context, user) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        const type = searchParams.get("type") || "patients"; // 'patients' or 'machines'

        console.log(`Calendar API Request: Type=${type}, Month=${month}, Year=${year}`);

        const events = [];
        const eventsByDate = {};

        const formatDate = (dateInput) => {
            if (!dateInput) return null;
            const d = new Date(dateInput);
            const z = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
            const res = z.toISOString().split('T')[0];
            // console.log(`FormatDate: Input=${dateInput} -> ${d.toISOString()} -> Res=${res}`);
            return res;
        };

        if (type === "machines") {
            let sql = `
                SELECT 
                    m.id, m.machine_name, m.machine_id, m.serial_number, 
                    m.status, m.clinic_name, m.location,
                    m.rental_end_date, m.warranty_expiry, m.next_Maintenance_date,
                    h.name as hospital_name
                FROM machines m
                LEFT JOIN hospitals h ON m.assigned_hospitals_id = h.id
                WHERE m.rental_end_date IS NOT NULL
                OR m.warranty_expiry IS NOT NULL
                OR m.next_Maintenance_date IS NOT NULL
            `;
            const params = [];

            const conditions = [];
            if (month && year) {
                // Filter optimization
                let dateFilters = [];
                dateFilters.push(`(rental_end_date IS NOT NULL AND YEAR(rental_end_date) = ? AND MONTH(rental_end_date) = ?)`);
                params.push(year, month);
                dateFilters.push(`(warranty_expiry IS NOT NULL AND YEAR(warranty_expiry) = ? AND MONTH(warranty_expiry) = ?)`);
                params.push(year, month);
                dateFilters.push(`(next_Maintenance_date IS NOT NULL AND YEAR(next_Maintenance_date) = ? AND MONTH(next_Maintenance_date) = ?)`);
                params.push(year, month);

                sql += " AND (" + dateFilters.join(" OR ") + ")";
            }

            const machines = await query(sql, params);

            machines.forEach(m => {
                // Rental End Event
                if (m.rental_end_date) {
                    const dateStr = formatDate(m.rental_end_date);
                    console.log(`Machine ${m.machine_name} RentalEnd: Raw=${m.rental_end_date}, Formatted=${dateStr}`);
                    const event = {
                        id: `rental-end-${m.id}`,
                        title: `Rental Ends: ${m.machine_name}`,
                        type: 'rental_end',
                        date: dateStr,
                        time: 'All Day',
                        details: `Hospital: ${m.hospital_name || m.clinic_name || m.location}`,
                        machine_id: m.id,
                        status: 'warning'
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                }

                // Warranty Expiry
                if (m.warranty_expiry) {
                    const dateStr = formatDate(m.warranty_expiry);
                    const event = {
                        id: `warranty-${m.id}`,
                        title: `Warranty Exp: ${m.machine_name}`,
                        type: 'warranty_expiry',
                        date: dateStr,
                        time: 'All Day',
                        details: `Serial: ${m.serial_number}`,
                        machine_id: m.id,
                        status: 'critical'
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                }

                // Maintenance
                if (m.next_Maintenance_date) {
                    const dateStr = formatDate(m.next_Maintenance_date);
                    const event = {
                        id: `maint-${m.id}`,
                        title: `Maintenance: ${m.machine_name}`,
                        type: 'maintenance',
                        date: dateStr,
                        time: 'All Day',
                        details: `Status: ${m.status}`,
                        machine_id: m.id,
                        status: 'info'
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                }
            });

        } else if (type === "leads") {
            let sql = `
                SELECT 
                    l.id, l.name, l.phone, l.status, l.surgery_name, l.source,
                    l.next_followup_at, l.consulted_date,
                    u.username as owner_name
                FROM leads l
                LEFT JOIN users u ON l.owner_id = u.id
                WHERE l.next_followup_at IS NOT NULL OR l.consulted_date IS NOT NULL
            `;
            const params = [];

            if (month && year) {
                sql += ` AND (
                    (l.next_followup_at IS NOT NULL AND YEAR(l.next_followup_at) = ? AND MONTH(l.next_followup_at) = ?) OR
                    (l.consulted_date IS NOT NULL AND YEAR(l.consulted_date) = ? AND MONTH(l.consulted_date) = ?)
                )`;
                params.push(year, month, year, month);
            }

            const activeLeads = await query(sql, params);

            activeLeads.forEach(lead => {
                // Next Follow-up Event
                if (lead.next_followup_at) {
                    const dateStr = formatDate(lead.next_followup_at);
                    const event = {
                        id: `lead-followup-${lead.id}`,
                        title: `Follow-up: ${lead.name}`,
                        type: 'lead_followup',
                        date: dateStr,
                        time: new Date(lead.next_followup_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        details: `Status: ${lead.status} | Source: ${lead.source}`,
                        lead_id: lead.id,
                        status: 'warning', // Amber/Yellow
                        owner: lead.owner_name
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                }

                // Consulted Date Event
                if (lead.consulted_date) {
                    const dateStr = formatDate(lead.consulted_date);
                    const event = {
                        id: `lead-consulted-${lead.id}`,
                        title: `Consulted: ${lead.name}`,
                        type: 'lead_consulted',
                        date: dateStr,
                        time: 'All Day',
                        details: `Surgery: ${lead.surgery_name}`,
                        lead_id: lead.id,
                        status: 'success', // Green
                        owner: lead.owner_name
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                }
            });

        } else {
            // PATIENTS VIEW (Surgeries + Consultations)

            // 1. Fetch Surgeries (Existing Logic)
            let sqlSurgeries = `
                SELECT 
                    ps.id, ps.patient_id, ps.surgery_type, ps.surgery_date, ps.consultation_date, ps.ot_scheduled_date, ps.status,
                    p.patient_id as patient_code, p.first_name, p.last_name, p.phone,
                    u.username as surgeon_name, h.name as hospital_name, cb.username as care_buddy_name
                FROM patient_surgeries ps
                INNER JOIN patients p ON ps.patient_id = p.id
                LEFT JOIN doctors d ON ps.surgeon_id = d.id
                LEFT JOIN users u ON d.user_id = u.id
                LEFT JOIN hospitals h ON ps.hospital_id = h.id
                LEFT JOIN users cb ON ps.care_buddy_id = cb.id
                WHERE 1=1
            `;
            const paramsSurgeries = [];
            if (user.role === "carebuddy") {
                sqlSurgeries += " AND ps.care_buddy_id = ?";
                paramsSurgeries.push(user.id);
            }
            if (month && year) {
                sqlSurgeries += ` AND (
                    (YEAR(ps.consultation_date) = ? AND MONTH(ps.consultation_date) = ?) OR
                    (YEAR(ps.surgery_date) = ? AND MONTH(ps.surgery_date) = ?) OR
                    (YEAR(ps.ot_scheduled_date) = ? AND MONTH(ps.ot_scheduled_date) = ?)
                )`;
                const m = parseInt(month), y = parseInt(year);
                paramsSurgeries.push(y, m, y, m, y, m);
            }

            const surgeries = await query(sqlSurgeries, paramsSurgeries);

            surgeries.forEach(caseItem => {
                // Helper to add event
                const addEvent = (dateStrOriginal, typePrefix, title, type, timeStr) => {
                    if (!dateStrOriginal) return;
                    const dateStr = formatDate(dateStrOriginal);
                    const event = {
                        id: `${typePrefix}-${caseItem.id}`,
                        case_id: caseItem.id,
                        type: type,
                        date: dateStr,
                        time: timeStr || new Date(dateStrOriginal).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        patient_name: `${caseItem.first_name} ${caseItem.last_name}`,
                        title: title || `${caseItem.first_name} ${caseItem.last_name} - ${type}`,
                        details: `${caseItem.surgery_type} (${caseItem.status})`,
                        surgeon_name: caseItem.surgeon_name,
                        hospital_name: caseItem.hospital_name,
                        phone: caseItem.phone
                    };
                    events.push(event);
                    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                    eventsByDate[dateStr].push(event);
                };

                addEvent(caseItem.consultation_date, 'surg-cons', null, 'consultation');
                addEvent(caseItem.surgery_date, 'surg-op', null, 'surgery');
                addEvent(caseItem.ot_scheduled_date, 'surg-ot', null, 'ot_scheduled');
            });

            // 2. Fetch General Consultations from Visits
            let sqlVisits = `
                SELECT 
                    v.id, v.visit_date, v.visit_time, v.visit_type, v.status,
                    p.first_name, p.last_name, p.phone,
                    u.username as doctor_name, h.name as hospital_name
                FROM visits v
                JOIN patients p ON v.patient_id = p.id
                LEFT JOIN doctors d ON v.doctor_id = d.id
                LEFT JOIN users u ON d.user_id = u.id
                LEFT JOIN hospitals h ON v.hospital_id = h.id
                WHERE v.visit_type = 'Consultation'
            `;
            const paramsVisits = [];
            if (month && year) {
                sqlVisits += " AND YEAR(v.visit_date) = ? AND MONTH(v.visit_date) = ?";
                paramsVisits.push(year, month);
            }

            const visits = await query(sqlVisits, paramsVisits);

            visits.forEach(v => {
                const dateStr = formatDate(v.visit_date);
                const event = {
                    id: `visit-${v.id}`,
                    visit_id: v.id,
                    type: 'general_consultation',
                    date: dateStr,
                    time: v.visit_time, // Assuming TIME format H:M:S
                    patient_name: `${v.first_name} ${v.last_name}`,
                    title: `${v.first_name} ${v.last_name} - Consultation`,
                    details: `General Consultation (${v.status})`,
                    surgeon_name: v.doctor_name,
                    hospital_name: v.hospital_name,
                    phone: v.phone
                };
                events.push(event);
                if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
                eventsByDate[dateStr].push(event);
            });
        }

        // Get upcoming events (next 7 days)
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const upcomingEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= nextWeek;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        return NextResponse.json({
            events,
            eventsByDate,
            upcomingEvents,
            totalEvents: events.length
        });
    } catch (error) {
        console.error("Calendar API Error:", error);
        return NextResponse.json({ message: error.message, error: error.toString() }, { status: 500 });
    }
}

const handler = withPermission(MODULES.PIPELINE, {
    GET: handleGet
});

export { handler as GET };
