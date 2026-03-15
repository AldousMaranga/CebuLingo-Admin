import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function Lessons() {
    const [showModal, setShowModal] = useState(false);
    const [lessonTitle, setLessonTitle] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await addDoc(collection(db, "lessons"), {
                title: lessonTitle,
                createdAt: new Date()
            });

            alert("Lesson added successfully!");

            setLessonTitle("");
            setShowModal(false);

        } catch (error) {
            console.error("Error adding lesson:", error);
        }
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
                Full lesson management interface...
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