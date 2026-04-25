import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

export async function POST(req: Request) {
  try {
    const { driverId, driverName, speed, timestamp, assignedHospital } = await req.json();

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    // Initialize jsPDF
    const doc = new jsPDF();
    
    // Add styling and content
    doc.setFillColor(15, 23, 42); // slate-950
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('LOOKOUT INCIDENT LOG', 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 40, { align: 'center' });
    
    doc.setDrawColor(51, 65, 85); // slate-700
    doc.line(20, 50, 190, 50);

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Mission Details', 20, 70);

    doc.setFontSize(12);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Driver Name: ${driverName || 'Unknown'}`, 20, 85);
    doc.text(`Driver ID: ${driverId}`, 20, 95);
    doc.text(`Assigned Hospital: ${assignedHospital || 'Not Assigned'}`, 20, 105);
    
    const speedKmH = speed ? Math.round(speed * 3.6) : 0;
    doc.text(`Last Recorded Speed: ${speedKmH} km/h`, 20, 115);
    
    const missionTime = timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
    doc.text(`Mission Started/Updated: ${missionTime}`, 20, 125);
    
    doc.setDrawColor(51, 65, 85);
    doc.line(20, 140, 190, 140);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('This is an automatically generated report by Lookout System.', 105, 280, { align: 'center' });

    // Output as base64 string
    const pdfBase64 = doc.output('datauristring');

    return NextResponse.json({ 
      success: true, 
      pdfData: pdfBase64 
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
