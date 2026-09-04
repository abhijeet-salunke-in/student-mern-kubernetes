# Student MERN Application on Kubernetes

A production-style deployment of a MERN (MongoDB, Express, React, Node.js) student application on Kubernetes.

This project demonstrates how to containerize a MERN application with Docker and deploy it directly to a Kubernetes cluster running on AWS using kOps.

The application uses a MongoDB StatefulSet with a 3-member MongoDB Replica Set and persistent storage.

---

## Architecture

```text
                         Internet
                            │
                            ▼
                    AWS LoadBalancer
                            │
                            ▼
                    react-service
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
            React Pod 1           React Pod 2
                 │                     │
                 └──────────┬──────────┘
                            │
                         Nginx
                            │
                         /api
                            ▼
                     node-service
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
             Node Pod 1            Node Pod 2
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                   MongoDB Headless
                       Service
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          mongodb-0     mongodb-1     mongodb-2
           PRIMARY      SECONDARY     SECONDARY
              │             │             │
              └─────────────┼─────────────┘
                            │
                     Replica Set: rs0
```
---

## Project Structure

```text
student-mern-kubernetes/
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       └── App.jsx
│
└── yamls/
    ├── sts.yml
    ├── sts-svc.yml
    ├── node-config.yaml
    ├── node-deployment.yml
    ├── node-service.yaml
    ├── react-deployment.yaml
    └── react-service.yaml
```

---

# Technology Stack

## Application

* React
* Node.js
* Express.js
* MongoDB
* Mongoose
* Axios

## Containerization

* Docker
* Docker Hub

## Kubernetes

* Kubernetes
* kOps
* AWS
* StatefulSet
* Deployment
* Service
* ConfigMap
* PersistentVolumeClaim
* PersistentVolume

## Web Server

* Nginx

---

# Application

The application displays student information retrieved from MongoDB.

Each student contains:

```text
name
age
course
```

Example:

```json
{
  "name": "Rahul Sharma",
  "age": 21,
  "course": "Computer Science"
}
```

---

# Backend

The backend is built with Node.js and Express.

It exposes:

```text
GET /api/students
```

The backend connects to MongoDB using the `MONGO_URI` environment variable.

Example MongoDB connection:

```text
mongodb://mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/school?replicaSet=rs0
```

The application listens on:

```text
5000
```

---

# Frontend

The frontend is built using React and Vite.

The React application requests student data using:

```javascript
axios.get("/api/students")
```

The frontend does not directly connect to the backend using a public IP.

Instead, Nginx acts as a reverse proxy.

```text
Browser
   │
   │ /api/students
   ▼
Nginx
   │
   │ node-service:5000
   ▼
Node.js Backend
```

---

# Nginx Reverse Proxy

The frontend container uses Nginx to serve the React production build.

The `/api/` requests are forwarded to the Kubernetes backend Service.

```nginx
location /api/ {
    proxy_pass http://node-service:5000;
}
```

This allows the browser to use:

```text
/api/students
```

instead of requiring a backend public IP.

---

# Docker

## Backend Image

The backend is containerized using:

```text
node:20
```

Build:

```bash
docker build -t abhisalunke16/student-backend:v1 ./backend
```

## Frontend Image

The frontend uses a multi-stage Docker build.

First stage:

```text
Node.js
    ↓
npm install
    ↓
npm run build
    ↓
dist/
```

Second stage:

```text
Nginx
    ↓
React production files
```

Build:

```bash
docker build -t abhisalunke16/student-frontend:v1 ./frontend
```

---

# Docker Hub

The application images are stored in Docker Hub.

Backend:

```text
abhisalunke16/student-backend:v1
```

Frontend:

```text
abhisalunke16/student-frontend:v1
```

Push images:

```bash
docker push abhisalunke16/student-backend:v1
docker push abhisalunke16/student-frontend:v1
```

Kubernetes worker nodes can pull these images from the registry.

---

# MongoDB StatefulSet

MongoDB is deployed using a Kubernetes StatefulSet instead of a Deployment.

Why?

MongoDB is a stateful application and requires:

* Stable pod identity
* Stable network identity
* Persistent storage

The StatefulSet creates:

```text
mongodb-0
mongodb-1
mongodb-2
```

Each MongoDB pod gets its own persistent volume.

---

# MongoDB Replica Set

The MongoDB cluster contains three members:

```text
mongodb-0 → PRIMARY
mongodb-1 → SECONDARY
mongodb-2 → SECONDARY
```

Replica Set name:

```text
rs0
```

The replica set provides data replication and automatic primary election.

If the primary fails, another eligible member can become the primary.

---

# Initializing the Replica Set

The replica set is initialized from `mongodb-0`.

Connect to MongoDB:

```bash
kubectl exec -it mongodb-0 -- mongosh
```

Initialize:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb:27017" },
    { _id: 1, host: "mongodb-1.mongodb:27017" },
    { _id: 2, host: "mongodb-2.mongodb:27017" }
  ]
})
```

Verify:

```javascript
rs.status()
```

Expected architecture:

```text
rs0
├── mongodb-0 → PRIMARY
├── mongodb-1 → SECONDARY
└── mongodb-2 → SECONDARY
```

---

# MongoDB Headless Service

MongoDB uses a headless Service:

```yaml
clusterIP: None
```

This allows the StatefulSet members to have stable DNS names.

Examples:

```text
mongodb-0.mongodb
mongodb-1.mongodb
mongodb-2.mongodb
```

These DNS names are used by the MongoDB replica set.

---

# Persistent Storage

Each MongoDB StatefulSet replica receives its own PVC.

```text
mongodb-0
    ↓
PVC
    ↓
PV
    ↓
AWS EBS

mongodb-1
    ↓
PVC
    ↓
PV
    ↓
AWS EBS

mongodb-2
    ↓
PVC
    ↓
PV
    ↓
AWS EBS
```

The PVC requests storage.

The PV represents the Kubernetes storage resource.

The actual persistent data is stored on the underlying AWS EBS volume.

---

# Backend Deployment

The Node.js backend runs as a Deployment with two replicas.

```text
node-deploy
├── Node Pod 1
└── Node Pod 2
```

The backend is exposed internally using a ClusterIP Service:

```text
node-service:5000
```

The backend does not need a public LoadBalancer because Nginx communicates with it internally through the Kubernetes Service.

---

# Backend Configuration

The MongoDB connection string is supplied through a ConfigMap.

```yaml
data:
  MONGO_URI: "mongodb://mongodb-0.mongodb:27017,mongodb-1.mongodb:27017,mongodb-2.mongodb:27017/school?replicaSet=rs0"
  PORT: "5000"
```

The backend connects to the `school` database and the `students` collection.

---

# Frontend Deployment

The React frontend runs as a Deployment with two replicas.

```text
react-deploy
├── React/Nginx Pod 1
└── React/Nginx Pod 2
```

The frontend is exposed using an AWS LoadBalancer Service.

```text
react-service
type: LoadBalancer
port: 80
```

This provides external access to the application.

---

# Kubernetes Deployment

Apply the MongoDB resources first:

```bash
kubectl apply -f yamls/sts.yml
kubectl apply -f yamls/sts-svc.yml
```

Verify:

```bash
kubectl get sts
kubectl get pods
kubectl get svc
```

Initialize the MongoDB replica set:

```bash
kubectl exec -it mongodb-0 -- mongosh
```

Then:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb:27017" },
    { _id: 1, host: "mongodb-1.mongodb:27017" },
    { _id: 2, host: "mongodb-2.mongodb:27017" }
  ]
})
```

Verify:

```javascript
rs.status()
```

---

## Insert Student Data

Connect to the primary:

```bash
kubectl exec -it mongodb-0 -- mongosh
```

Select the database:

```javascript
use school
```

Insert data:

```javascript
db.students.insertMany([
  {
    name: "Rahul Sharma",
    age: 21,
    course: "Computer Science"
  },
  {
    name: "Akashad Patel",
    age: 22,
    course: "Information Technology"
  },
  {
    name: "Amit Kumar",
    age: 20,
    course: "Electronics"
  }
])
```

Verify:

```javascript
db.students.find().pretty()
```

---

# Deploy Backend

Apply the ConfigMap:

```bash
kubectl apply -f yamls/node-config.yaml
```

Deploy the backend:

```bash
kubectl apply -f yamls/node-deployment.yml
```

Create the backend Service:

```bash
kubectl apply -f yamls/node-service.yaml
```

Verify:

```bash
kubectl get deploy
kubectl get pods
kubectl get svc
```

Check backend logs:

```bash
kubectl logs deployment/node-deploy
```

Expected:

```text
MongoDB Connected
Server running on port 5000
```

---

# Deploy Frontend

Deploy the frontend:

```bash
kubectl apply -f yamls/react-deployment.yaml
```

Create the LoadBalancer Service:

```bash
kubectl apply -f yamls/react-service.yaml
```

Verify:

```bash
kubectl get deploy
kubectl get pods
kubectl get svc
```

The frontend Service should receive an AWS LoadBalancer hostname.

Open the hostname in a browser.

---

# Final Request Flow

When a user opens the application:

```text
Browser
   │
   ▼
AWS LoadBalancer
   │
   ▼
react-service
   │
   ▼
Nginx
   │
   ├── / → React application
   │
   └── /api/students
          │
          ▼
     node-service:5000
          │
          ▼
      Node.js Pods
          │
          ▼
   MongoDB Replica Set
          │
          ▼
      school.students
```

---

# Verification

Check StatefulSet:

```bash
kubectl get sts
```

Expected:

```text
mongodb   3/3
```

Check Deployments:

```bash
kubectl get deploy
```

Expected:

```text
node-deploy    2/2
react-deploy   2/2
```

Check Pods:

```bash
kubectl get pods
```

Expected:

```text
mongodb-0       Running
mongodb-1       Running
mongodb-2       Running
node-deploy-*   Running
node-deploy-*   Running
react-deploy-*  Running
react-deploy-*  Running
```

Check Services:

```bash
kubectl get svc
```

Expected:

```text
mongodb          ClusterIP    None
node-service     ClusterIP
react-service    LoadBalancer
```

Check persistent volumes:

```bash
kubectl get pv
kubectl get pvc
```

All MongoDB PVCs should be:

```text
Bound
```

---

# Key Kubernetes Concepts Demonstrated

This project demonstrates:

* Kubernetes StatefulSet
* Kubernetes Deployment
* Kubernetes Services
* Headless Service
* ClusterIP Service
* AWS LoadBalancer Service
* ConfigMap
* PersistentVolume
* PersistentVolumeClaim
* Dynamic storage provisioning
* AWS EBS persistent storage
* MongoDB Replica Set
* MongoDB Primary/Secondary architecture
* Kubernetes DNS
* Docker image management
* Docker Hub image registry
* Nginx reverse proxy
* Multi-stage Docker builds
* Kubernetes application-to-database communication

---

# Future Improvements

The project can later be extended with:

* Kubernetes Secrets
* Readiness and liveness probes
* CPU/memory requests and limits
* Horizontal Pod Autoscaler
* NetworkPolicies
* PodDisruptionBudgets
* Pod anti-affinity
* MongoDB backup strategy
* TLS/HTTPS
* Kubernetes Ingress
* Helm
* CI/CD pipeline
* Monitoring and logging

---

## Author

Abhisalunke16
