# Claude Opus Prompt — Full IT460 Project with Zero-to-Hero OpenShift Deployment Guide

## Role

You are an **expert OpenShift instructor, cloud engineer, and university project evaluator**.

You are teaching a **complete beginner** who has:
- Never deployed anything on OpenShift
- Limited cloud experience
- High time pressure

Your job is to:
- Design a **simple but complete project**
- Implement it fully
- Ensure **ALL project proposal requirements are satisfied**
- Provide a **ZERO → HERO deployment guide** that leaves NOTHING implicit

---

## Project Context

- Course: **Cloud Computing (IT460)**
- Project Title: **Multi-Container Application Development**
- Platform: **OpenShift**
- Student level: **Beginner**
- Deadline: **Immediate**

⚠️ CRITICAL:
- Do NOT miss any requirement from the project proposal
- Do NOT assume prior OpenShift knowledge
- Do NOT overcomplicate the project
- The deployment guide is AS IMPORTANT as the code

---

## Project Proposal Requirements (MANDATORY)

You MUST strictly satisfy ALL of the following:

### Objectives
1. Containerization with OpenShift  
2. Microservices Architecture  
3. Communication Between Containers  
4. OpenShift Deployment Configuration  
5. Data Persistence  
6. Scalability and Load Balancing  

### Deliverables
- Source Code  
- Documentation  
- Demo / Presentation Plan  
- Final Project Report  

### Evaluation Criteria
- Correct OpenShift usage
- Correct container communication
- Correct persistence implementation
- Correct scalability demonstration
- Clear documentation

❌ Missing ANY item = unacceptable

---

## STEP 1 — Choose a Simple, Good Project Idea

You must choose a project that is:
- Simple
- Easy to understand
- Easy to deploy
- Easy to defend

Examples (choose ONE):
- Notes application
- Guestbook
- Task manager
- Simple knowledge base

Explain WHY this idea is appropriate for OpenShift and the course.

---

## STEP 2 — Define the Architecture Clearly

You MUST:
- List each microservice
- Explain its responsibility
- Explain how services communicate
- Provide a text-based architecture diagram

Example format:
User → Frontend → Backend → Persistent Storage


---

## STEP 3 — Implement the FULL Project

Generate COMPLETE, WORKING code:
- No skeletons
- No TODOs
- No placeholders

Include:
- Backend service
- Frontend service
- Data persistence logic

---

## STEP 4 — Containerization

Provide:
- Dockerfile for each service
- Explanation of each Dockerfile line
- How images are built locally and in OpenShift

---

## STEP 5 — OpenShift Configuration (YAML)

Generate FULL YAML files for:
- DeploymentConfig
- Service
- Route
- PersistentVolumeClaim

Explain:
- What each YAML does
- Why it is needed
- How it relates to OpenShift concepts

---

## STEP 6 — Data Persistence (CRITICAL)

You MUST:
1. Identify exactly what data persists
2. Show where it lives in the container
3. Show how PVC is mounted
4. Explain how data survives pod restarts
5. Explain how to VERIFY persistence

This explanation MUST satisfy an examiner.

---

## STEP 7 — Scalability & Load Balancing

Explain:
- Which service is scalable
- How to scale it
- How OpenShift load balances traffic
- How to VERIFY scaling worked

---

## STEP 8 — ZERO → HERO OPENSHIFT DEPLOYMENT GUIDE (MOST IMPORTANT)

⚠️ THIS SECTION IS MANDATORY AND MUST BE EXTREMELY DETAILED ⚠️

You MUST assume the student starts with:
- A fresh Ubuntu machine
- No OpenShift CLI installed
- No OpenShift project created
- No containers built

### The guide MUST include:

#### A. Environment Setup
- What OpenShift is (short explanation)
- How to install `oc` CLI
- How to verify installation
- Common errors and fixes

#### B. Accessing OpenShift
- Web console vs CLI explanation
- How to log in via CLI
- How to get login token
- How to verify login worked

#### C. Project Creation
- What a project/namespace is
- How to create it
- How to verify it exists

#### D. Building Images
- How OpenShift builds images
- BuildConfig explanation
- How to trigger builds
- How to verify build success

#### E. Deploying the Application
- Applying YAML files step-by-step
- What each resource does
- How to check pod status
- How to debug failed pods

#### F. Exposing the Application
- What a Route is
- How it works
- How to access the app in a browser

#### G. Persistence Verification
- How to add data
- How to delete a pod
- How to prove data still exists
- Why this satisfies persistence requirements

#### H. Scaling & Load Balancing
- How to scale replicas
- How to verify multiple pods
- How OpenShift distributes traffic

#### I. Troubleshooting Section
- Pods stuck in Pending
- Image pull errors
- Permission issues
- Volume mount errors

Include:
- Exact `oc` commands
- Expected outputs
- What to do if output is different

This guide should be so detailed that a beginner can follow it **without Googling anything**.

---

## STEP 9 — Documentation & Report

Generate:

### README.md
- Overview
- Architecture
- Deployment summary
- Persistence explanation
- Scaling instructions

### Final Report
- Introduction
- Architecture
- Implementation
- OpenShift Features Used
- Challenges
- Lessons Learned

---

## STEP 10 — FINAL COMPLIANCE CHECK (MANDATORY)

At the end, include a table:

| Requirement | How it is satisfied | Status |
|------------|--------------------|--------|

Every item must be marked:
✅ SATISFIED

If not, FIX IT before finalizing.

---

## Output Rules

- Clear sections
- File trees before code
- Code blocks for ALL files
- Separate:
  - AUTOMATIC (Claude-generated)
  - MANUAL (Student actions)

❌ No vague explanations  
❌ No skipped steps  
❌ No assumptions  

✅ The final result must be a **complete, deployable, defensible OpenShift project**

---

## Final Goal

A stressed beginner should be able to:
- Follow your guide step-by-step
- Deploy successfully
- Explain the project confidently
- Pass the IT460 course
