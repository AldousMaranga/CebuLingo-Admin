import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

function Lessons() {
    const [showModal, setShowModal] = useState(false);
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessons, setLessons] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [difficulty, setDifficulty] = useState("easy");
    const [category, setCategory] = useState("");
    const [csvFile, setCsvFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [pathway, setPathway] = useState("");

    const parseCSVFile = async (file) => {
        const text = await file.text();

        const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== "");

        if (lines.length < 2) {
            throw new Error("CSV file is empty or missing data.");
        }

        const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());

        const questionIndex = headers.indexOf("question");
        const answerIndex = headers.indexOf("answer");
        const choicesIndex = headers.indexOf("choices");

        if (questionIndex === -1 || answerIndex === -1) {
            throw new Error("CSV must contain 'question' and 'answer' columns.");
        }

        const rows = lines.slice(1).map((line) => {
            const cols = line.split(",").map((col) => col.trim());

            return {
                question: cols[questionIndex] || "",
                answer: cols[answerIndex] || "",
                choices: choicesIndex !== -1 ? cols[choicesIndex] || "" : ""
            };
        });

        return rows;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!lessonTitle.trim()) {
            alert("Lesson title is required");
            return;
        }

        if (!difficulty) {
            alert("Please select difficulty");
            return;
        }

        if (!category) {
            alert("Please select a category")
        }

        if (!editingId && !csvFile) {
            alert("Please upload a CSV file");
            return;
        }

        if (fileError) {
            alert("Please upload a valid CSV file.");
            return;
        }

        if (!pathway) {
            alert("Please select a pathway");
            return;
        }

        try {
            if (editingId) {
                await updateDoc(doc(db, "lessons", editingId), {
                    title: lessonTitle,
                    difficulty: difficulty,
                    category: category,
                    pathway: pathway
                });

                alert("Lesson updated successfully!");

            } else {

                const lessonRef = await addDoc(collection(db, "lessons"), {
                    title: lessonTitle,
                    difficulty: difficulty,
                    category: category,
                    pathway: pathway,
                    createdAt: serverTimestamp()
                });

                const lessonId = lessonRef.id;

                if (csvFile) {

                    const parsedRows = await parseCSVFile(csvFile);

                    await saveQuestionsToLesson(
                        lessonId,
                        parsedRows,
                        difficulty,
                        category
                    );

                    alert("Lesson and questions added successfully!");
                }
            }

            fetchLessons();

            setLessonTitle("");
            setDifficulty("");
            setCategory("");
            setPathway("");
            setCsvFile(null);
            setEditingId(null);
            setShowModal(false);

        } catch (error) {
            console.error("Error saving lesson:", error);
            alert("Something went wrong.");
        }
    };

    // Displaying Lessons
    // const fetchLessons = async () => {
    //     try {
    //         const q = query(
    //             collection(db, "lessons"),
    //             orderBy("createdAt", "desc")
    //         );

    //         const querySnapshot = await getDocs(q);

    //         const lessonsData = querySnapshot.docs.map(doc => ({
    //             id: doc.id,
    //             ...doc.data()
    //         }));

    //         setLessons(lessonsData);

    //     } catch (error) {
    //         console.error("Error fetching lessons:", error);
    //     }
    // };
    const fetchLessons = async () => {
        try {
            const q = query(
                collection(db, "lessons"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);

            const lessonsData = querySnapshot.docs.map((doc) => ({
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
    // const handleEdit = (lesson) => {
    //     setLessonTitle(lesson.title);
    //     setEditingId(lesson.id);
    //     setShowModal(true);
    // };
    const handleEdit = (lesson) => {
        setLessonTitle(lesson.title || "");
        setDifficulty(lesson.difficulty || "easy");
        setCategory(lesson.category || "easy");
        setPathway(lesson.pathway || "");
        setCsvFile(null);
        setEditingId(lesson.id);
        setShowModal(true);
    };

    const saveQuestionsToLesson = async (lessonId, rows, selectedDifficulty) => {
        for (const row of rows) {
            const questionData = {
                question: row.question || "",
                answer: row.answer || "",
                type: selectedDifficulty === "easy" ? "multiple_choice" : "short_answer"
            };

            if (selectedDifficulty === "easy") {
                questionData.choices = row.choices
                    ? row.choices.split(";").map((choice) => choice.trim())
                    : [];
            }

            await addDoc(
                collection(db, "lessons", lessonId, "questions"),
                questionData
            );
        }
    };

    return (


        <div className="lessons-cont">
            <div className="lesson-header">
                <h1>Lesson Management</h1>

                <div className="lesson-buttons-cont">
                    <button className="lesson-add-button" onClick={() => setShowModal(true)}>
                        + Create Lesson
                    </button>
                </div>
            </div>

            <div className="lesson-table-card">
                <div className="lesson-table-head">
                    <span>Lesson Title</span>
                    <span>Words</span>
                    <span>Completed</span>
                    <span>Rating</span>
                    <span>Actions</span>
                </div>

                <div className="lesson-list-cont">
                    {lessons.length === 0 ? (
                        <p className="empty-state">No lessons found.</p>
                    ) : (
                        lessons.map((lesson) => (
                            <div key={lesson.id} className="lesson-row">
                                <span className="lesson-title">{lesson.title}</span>
                                <span>{lesson.words || 0}</span>
                                <span>{lesson.completed || 0}</span>
                                <span>{lesson.rating || "—"}</span>

                                <div className="lesson-actions">
                                    <button className="icon-button edit" onClick={() => handleEdit(lesson)}>
                                        <FiEdit2 />
                                    </button>

                                    <button className="icon-button delete" onClick={() => handleDelete(lesson.id)}>
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h2>{editingId ? "Edit Lesson" : "Add Lesson"}</h2>

                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Lesson title"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                required
                            />

                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select Difficulty</option>
                                <option value="easy">Easy</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="hard">Hard</option>
                            </select>

                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                <option value="" disabled>Choose Lesson Category</option>
                                <option value="travel-culture">Travel & Culture</option>
                                <option value="family-friends">Family & Friends</option>
                                <option value="work-business">Work & Business</option>
                                <option value="personal-interest">Personal Interest</option>
                            </select>

                            <select
                                value={pathway}
                                onChange={(e) => setPathway(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select pathway</option>
                                <option value="greetings">Greetings</option>
                                <option value="food">Food</option>
                                <option value="travel">Travel</option>
                                <option value="family">Family</option>
                                <option value="fruits">Fruits</option>
                                <option value="animals">Animals</option>
                                <option value="body-parts">Body Parts</option>
                            </select>

                            <label className="csv-upload-button">
                                Upload CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files[0];

                                        if (!file) return;

                                        if (!file.name.toLowerCase().endsWith(".csv")) {
                                            setFileError("Only CSV files are allowed.");
                                            setCsvFile(null);
                                            return;
                                        }

                                        setFileError("");
                                        setCsvFile(file);
                                    }}
                                    hidden
                                />
                            </label>

                            {csvFile && (
                                <div className="csv-file-name">
                                    Selected: {csvFile.name}
                                </div>
                            )}

                            {fileError && (
                                <div className="csv-error">
                                    {fileError}
                                </div>
                            )}
                            <div className="modal-buttons">
                                <button type="submit" disabled={!lessonTitle || !difficulty || (!editingId && !csvFile)}>Save</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setLessonTitle("");
                                        setDifficulty("easy");
                                        setCsvFile(null);
                                        setEditingId(null);
                                    }}
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