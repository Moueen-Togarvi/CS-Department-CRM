import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

const FYP_PROJECTS = [
  {
    title: 'AI-Powered Student Attendance System',
    description: 'Develop an AI-based attendance system using facial recognition and computer vision to automate student attendance tracking in classrooms, reducing manual effort and improving accuracy.',
    status: 'IN_PROGRESS',
    supervisorName: 'Dr. Sarah Khan',
    members: [
      { studentName: 'Muhammad Ali', role: 'LEADER' },
      { studentName: 'Ayesha Siddiqui', role: 'MEMBER' },
      { studentName: 'Hassan Mehmood', role: 'MEMBER' },
    ],
    domain: 'Artificial Intelligence',
    methodology: 'Agile with bi-weekly sprints. Using Python, OpenCV, TensorFlow for facial recognition. React frontend for admin dashboard.',
    milestones: [
      { title: 'Literature Review', description: 'Complete survey of existing attendance systems and face recognition techniques', dueDate: '2025-02-28', status: 'COMPLETED', completedDate: '2025-02-25' },
      { title: 'Data Collection & Preprocessing', description: 'Collect and preprocess student image dataset', dueDate: '2025-03-15', status: 'COMPLETED', completedDate: '2025-03-14' },
      { title: 'Model Training', description: 'Train facial recognition model with dataset', dueDate: '2025-04-15', status: 'IN_PROGRESS' },
      { title: 'System Integration', description: 'Integrate model with web application', dueDate: '2025-05-15', status: 'PENDING' },
      { title: 'Testing & Documentation', description: 'Complete testing and prepare documentation', dueDate: '2025-06-01', status: 'PENDING' },
    ],
    evaluations: [],
  },
  {
    title: 'Smart Campus Navigation App',
    description: 'Build a mobile application for indoor and outdoor campus navigation using beacons and GPS, helping students and visitors find rooms, buildings, and facilities efficiently.',
    status: 'PROPOSED',
    supervisorName: 'Mr. Ali Raza',
    members: [
      { studentName: 'Zainab Khan', role: 'LEADER' },
      { studentName: 'Bilal Ahmed', role: 'MEMBER' },
    ],
    domain: 'Mobile Computing',
    methodology: 'Cross-platform approach with React Native. Indoor positioning via BLE beacons, outdoor via Google Maps API.',
    milestones: [
      { title: 'Proposal Submission', description: 'Submit detailed project proposal', dueDate: '2025-04-01', status: 'PENDING' },
      { title: 'Requirements Gathering', description: 'Gather and document system requirements', dueDate: '2025-04-15', status: 'PENDING' },
      { title: 'UI/UX Design', description: 'Design application wireframes and prototypes', dueDate: '2025-05-01', status: 'PENDING' },
    ],
    evaluations: [],
  },
  {
    title: 'Blockchain-Based Certificate Verification',
    description: 'Create a blockchain-based system for issuing and verifying academic certificates, ensuring tamper-proof records and reducing verification time for employers and institutions.',
    status: 'IN_PROGRESS',
    supervisorName: 'Dr. Ahmed Hassan',
    members: [
      { studentName: 'Sara Ali', role: 'LEADER' },
      { studentName: 'Omar Farooq', role: 'MEMBER' },
      { studentName: 'Hira Shah', role: 'MEMBER' },
    ],
    domain: 'Blockchain',
    methodology: 'Ethereum blockchain with Solidity smart contracts. IPFS for document storage. Next.js for verification portal.',
    milestones: [
      { title: 'Blockchain Network Setup', description: 'Set up local and test blockchain network', dueDate: '2025-02-15', status: 'COMPLETED', completedDate: '2025-02-12' },
      { title: 'Smart Contract Development', description: 'Develop certificate issuance and verification contracts', dueDate: '2025-03-15', status: 'COMPLETED', completedDate: '2025-03-18' },
      { title: 'IPFS Integration', description: 'Integrate IPFS for document storage', dueDate: '2025-04-10', status: 'IN_PROGRESS' },
      { title: 'Web Portal Development', description: 'Build verification and issuance web portal', dueDate: '2025-05-20', status: 'PENDING' },
    ],
    evaluations: [],
  },
  {
    title: 'Real-Time Exam Proctoring System',
    description: 'Design and implement an AI-powered online exam proctoring system that monitors students during exams using webcam feeds, detecting suspicious behavior in real-time.',
    status: 'EVALUATED',
    supervisorName: 'Dr. Fatima Noor',
    members: [
      { studentName: 'Farhan Raza', role: 'LEADER' },
      { studentName: 'Amina Yousuf', role: 'MEMBER' },
    ],
    domain: 'Computer Vision',
    methodology: 'Deep learning-based approach using YOLO for object detection and custom models for behavior analysis. Python backend, React frontend.',
    milestones: [
      { title: 'System Architecture Design', description: 'Design complete system architecture', dueDate: '2025-01-30', status: 'COMPLETED', completedDate: '2025-01-28' },
      { title: 'Core Detection Module', description: 'Implement face and object detection modules', dueDate: '2025-03-01', status: 'COMPLETED', completedDate: '2025-02-28' },
      { title: 'Real-Time Processing', description: 'Implement real-time video processing pipeline', dueDate: '2025-04-01', status: 'COMPLETED', completedDate: '2025-04-02' },
      { title: 'Dashboard & Reporting', description: 'Build admin dashboard and reporting module', dueDate: '2025-04-20', status: 'COMPLETED', completedDate: '2025-04-18' },
      { title: 'Final Testing & Report', description: 'Complete system testing and final report', dueDate: '2025-05-01', status: 'COMPLETED', completedDate: '2025-04-30' },
    ],
    evaluations: [
      {
        evaluatorName: 'Dr. Sarah Khan',
        type: 'PROPOSAL',
        scores: { relevance: 18, methodology: 16, feasibility: 17, innovation: 15 },
        total: 66,
        maxTotal: 80,
        comments: 'Strong proposal with clear methodology. Good innovation in approach.',
      },
      {
        evaluatorName: 'Dr. Ahmed Hassan',
        type: 'MID',
        scores: { progress: 35, quality: 30, teamwork: 28 },
        total: 93,
        maxTotal: 100,
        comments: 'Excellent progress. Team demonstrates strong technical skills and collaboration.',
      },
      {
        evaluatorName: 'Mr. Ali Raza',
        type: 'FINAL',
        scores: { implementation: 38, documentation: 25, presentation: 22, demo: 15 },
        total: 88,
        maxTotal: 100,
        comments: 'Outstanding implementation. System performs well under load. Documentation is thorough.',
      },
    ],
  },
]

export async function POST(_request: NextRequest) {
  try {
    // Check if projects already exist
    const existingCount = await db.project.count()
    if (existingCount > 0) {
      return successResponse({ created: 0, message: 'Projects already exist' })
    }

    const currentSemester = await db.semester.findFirst({ where: { isCurrent: true } })
    if (!currentSemester) {
      return errorResponse('No active semester found. Please run seed first.')
    }

    let createdProjects = 0

    for (const projDef of FYP_PROJECTS) {
      // Find supervisor
      const supervisor = await db.faculty.findFirst({
        where: { user: { name: projDef.supervisorName } },
      })
      if (!supervisor) {
        console.error(`Supervisor not found: ${projDef.supervisorName}`)
        continue
      }

      const project = await db.project.create({
        data: {
          title: projDef.title,
          description: projDef.description,
          semesterId: currentSemester.id,
          supervisorId: supervisor.id,
          status: projDef.status,
          domain: projDef.domain,
          methodology: projDef.methodology,
        },
      })

      // Add members
      for (const memberDef of projDef.members) {
        const student = await db.student.findFirst({
          where: { user: { name: memberDef.studentName } },
        })
        if (student) {
          await db.projectMember.create({
            data: {
              projectId: project.id,
              studentId: student.id,
              role: memberDef.role,
            },
          })
        }
      }

      // Add milestones
      for (const ms of projDef.milestones) {
        await db.projectMilestone.create({
          data: {
            projectId: project.id,
            title: ms.title,
            description: ms.description,
            dueDate: new Date(ms.dueDate),
            status: ms.status,
            completedDate: ms.completedDate ? new Date(ms.completedDate) : null,
          },
        })
      }

      // Add evaluations
      for (const evalDef of projDef.evaluations) {
        const evaluator = await db.faculty.findFirst({
          where: { user: { name: evalDef.evaluatorName } },
        })
        if (evaluator) {
          await db.fYPEvaluation.create({
            data: {
              projectId: project.id,
              evaluatorId: evaluator.id,
              evaluationType: evalDef.type,
              criteriaScores: JSON.stringify(evalDef.scores),
              totalScore: evalDef.total,
              maxTotalScore: evalDef.maxTotal,
              comments: evalDef.comments,
              evaluatedAt: new Date(),
            },
          })
        }
      }

      createdProjects++
    }

    return successResponse({ created: createdProjects }, `${createdProjects} FYP projects seeded`)
  } catch (error) {
    console.error('FYP seed error:', error)
    return errorResponse('Error seeding FYP data', 500)
  }
}