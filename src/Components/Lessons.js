import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { useEffect } from "react";
import { serverTimestamp } from "firebase/firestore";

function Lessons() {
    const [showModal, setShowModal] = useState(false);
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessons, setLessons] = useState([]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await addDoc(collection(db, "lessons"), {
                title: lessonTitle,
                createdAt: serverTimestamp()
            });

            fetchLessons();

            alert("Lesson added successfully!");

            setLessonTitle("");
            setShowModal(false);

        } catch (error) {
            console.error("Error adding lesson:", error);
        }
    };


    const fetchLessons = async () => {
        try {
            const q = query(
                collection(db, "lessons"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);

            const lessonsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setLessons(lessonsData);

        } catch (error) {
            console.error("Error fetching lessons:", error);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);



    return (
        <div className="lessons-cont">

            <div className="lesson-header">
                <div>Lessons Management</div>

                <div className="lesson-buttons-cont">
                    <button className="lesson-add-button" onClick={() => setShowModal(true)}>
                        Add Lesson
                    </button>
                </div>
            </div>

            <div className="lesson-list-cont">

                {lessons.length === 0 ? (
                    <p>No lessons found.</p>
                ) : (
                    lessons.map((lesson) => (
                        <div key={lesson.id} className="lesson-item">
                            {lesson.title}
                        </div>
                    ))
                )}

            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">

                        <h2>Add Lesson</h2>

                        <form onSubmit={handleSubmit}>
                            {/* <label >Lesson Title</label> */}
                            <input type="text" placeholder="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />

                            <div className="modal-buttons">
                                <button type="submit">Save</button>

                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Lessons;