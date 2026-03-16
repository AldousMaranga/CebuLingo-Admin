import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import { serverTimestamp } from "firebase/firestore";

function Lessons() {
    const [showModal, setShowModal] = useState(false);
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessons, setLessons] = useState([]);
    const [editingId, setEditingId] = useState(null);

    // Adding Lessons
    // const handleSubmit = async (e) => {
    //     e.preventDefault();

    //     try {
    //         await addDoc(collection(db, "lessons"), {
    //             title: lessonTitle,
    //             createdAt: serverTimestamp()
    //         });

    //         fetchLessons();

    //         alert("Lesson added successfully!");

    //         setLessonTitle("");
    //         setShowModal(false);

    //     } catch (error) {
    //         console.error("Error adding lesson:", error);
    //     }
    // };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                // UPDATE EXISTING
                await updateDoc(doc(db, "lessons", editingId), {
                    title: lessonTitle
                });

                alert("Lesson updated successfully!");

            } else {
                // CREATE NEW
                await addDoc(collection(db, "lessons"), {
                    title: lessonTitle,
                    createdAt: new Date()
                });

                alert("Lesson added successfully!");
            }

            fetchLessons();

            setLessonTitle("");
            setEditingId(null);
            setShowModal(false);

        } catch (error) {
            console.error("Error saving lesson:", error);
        }
    };

    // Displaying Lessons
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

    // Page gets refreshed after every added lessons
    useEffect(() => {
        fetchLessons();
    }, []);

    // Deleting Lessons
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Delete this lesson?");

        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "lessons", id));
            fetchLessons(); // refresh list
        } catch (error) {
            console.error("Error deleting lesson:", error);
        }
    };

    // Editing Lessons
    const handleEdit = (lesson) => {
        setLessonTitle(lesson.title);
        setEditingId(lesson.id);
        setShowModal(true);
    };



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

                            <span>{lesson.title}</span>

                            <div className="lesson-actions">

                                <button onClick={() => handleEdit(lesson)}>
                                    Edit
                                </button>

                                <button onClick={() => handleDelete(lesson.id)}>
                                    Delete
                                </button>

                            </div>

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