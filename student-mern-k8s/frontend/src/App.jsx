import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    axios
      .get("/api/students")
      .then((response) => {
        setStudents(response.data);
      })
      .catch((error) => {
        console.error("Error fetching students:", error);
      });
  }, []);

  return (
    <div>
      <h1>College Students</h1>

      {students.map((student) => (
        <div key={student._id}>
          <h3>{student.name}</h3>
          <p>Age: {student.age}</p>
          <p>Course: {student.course}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;
