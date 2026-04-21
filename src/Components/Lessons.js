import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

function Lessons() {
    const [showModal, setShowModal] = useState(false);
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessons, setLessons] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const [difficulty, setDifficulty] = useState("");
    const [category, setCategory] = useState("");
    const [pathway, setPathway] = useState("");
    const [lessonType, setLessonType] = useState("");

    const [csvFile, setCsvFile] = useState(null);
    const [fileError, setFileError] = useState("");

    const pathwayMap = {
        "travel-culture": [
            "greetings",
            "food",
            "travel",
            "directions",
            "cultural-etiquette"
        ],
        "family-friends": [
            "introductions",
            "family",
            "relationships",
            "daily-conversations",
            "emotions"
        ],
        "work-business": [
            "workplace-basics",
            "meetings",
            "customer-service",
            "professional-phrases",
            "job-interview"
        ],
        "personal-interest": [
            "animals",
            "fruits",
            "body-parts",
            "shopping",
            "hobbies"
        ]
    };

    const lessonTypeMap = {
        easy: ["image_identification"],
        intermediate: ["spelling", "pronunciation"],
        hard: ["phrase_typing", "phrase_speaking"]
    };

    const formatLabel = (value) => {
        if (!value) return "—";
        return value
            .split("-")
            .join(" ")
            .split("_")
            .join(" ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const resetForm = () => {
        setShowModal(false);
        setLessonTitle("");
        setDifficulty("");
        setCategory("");
        setPathway("");
        setLessonType("");
        setCsvFile(null);
        setFileError("");
        setEditingId(null);
    };

    useEffect(() => {
        setPathway("");
    }, [category]);

    useEffect(() => {
        setLessonType("");
    }, [difficulty]);

    useEffect(() => {
        if (difficulty === "easy") {
            setLessonType("image_identification");
        }
    }, [difficulty]);

    const parseCSVLine = (line) => {
        const values = [];
        let currentValue = "";
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const currentChar = line[index];
            const nextChar = line[index + 1];

            if (currentChar === "\"") {
                if (inQuotes && nextChar === "\"") {
                    currentValue += "\"";
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (currentChar === "," && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = "";
            } else {
                currentValue += currentChar;
            }
        }

        values.push(currentValue.trim());

        return values;
    };

    const parseCSVFile = async (file) => {
        const text = await file.text();

        const lines = text
            .split("\n")
            .map((line) => line.replace(/\r/g, "").trim())
            .filter((line) => line !== "");

        if (lines.length < 2) {
            throw new Error("CSV file is empty or missing data.");
        }

        const parsedHeaders = parseCSVLine(lines[0]).map((header) =>
            header.trim().toLowerCase()
        );

        const getIndex = (...names) =>
            names.map((name) => parsedHeaders.indexOf(name)).find((index) => index !== -1) ?? -1;

        const questionIndex = getIndex("question");
        const promptIndex = getIndex("prompt");
        const targetTextIndex = getIndex("targettext");
        const answerIndex = getIndex("answer");
        const acceptedAnswersIndex = getIndex("acceptedanswers", "acceptedanswer");
        const recognitionLangIndex = getIndex("recognitionlang");
        const typeIndex = getIndex("type");
        const choicesIndex = getIndex("choices");
        const imageUrlIndex = getIndex("imageurl", "image_url", "image", "picture", "photo");

        if (questionIndex === -1 || answerIndex === -1) {
            throw new Error("CSV must contain 'question' and 'answer' columns.");
        }

        return lines.slice(1).map((line) => {
            const cols = parseCSVLine(line);

            return {
                question: cols[questionIndex] || "",
                prompt: promptIndex !== -1 ? cols[promptIndex] || "" : "",
                targetText: targetTextIndex !== -1 ? cols[targetTextIndex] || "" : "",
                answer: cols[answerIndex] || "",
                acceptedAnswers: acceptedAnswersIndex !== -1 ? cols[acceptedAnswersIndex] || "" : "",
                recognitionLang: recognitionLangIndex !== -1 ? cols[recognitionLangIndex] || "" : "",
                type: typeIndex !== -1 ? cols[typeIndex] || "" : "",
                choices: choicesIndex !== -1 ? cols[choicesIndex] || "" : "",
                imageUrl: imageUrlIndex !== -1 ? cols[imageUrlIndex] || "" : ""
            };
        });
    };


    const saveQuestionsToLesson = async (
        lessonId,
        rows,
        selectedDifficulty,
        selectedLessonType
    ) => {
        for (const row of rows) {
            const normalizedType = (row.type || selectedLessonType || "").trim();

            const questionData = {
                question: row.question || "",
                prompt: row.prompt || row.question || "",
                targetText: row.targetText || row.answer || "",
                answer: row.answer || "",
                acceptedAnswers: row.acceptedAnswers || "",
                recognitionLang: row.recognitionLang || "",
                difficulty: selectedDifficulty,
                lessonType: normalizedType || selectedLessonType,
                type: normalizedType || selectedLessonType
            };

            if (row.choices) {
                questionData.choices = row.choices
                    .split(";")
                    .map((choice) => choice.trim())
                    .filter(Boolean);
            }

            if (row.imageUrl) {
                try {
                    new URL(row.imageUrl);
                    questionData.imageUrl = row.imageUrl;
                } catch (error) {
                    throw new Error(`Invalid image URL in CSV: ${row.imageUrl}`);
                }
            }

            await addDoc(
                collection(db, "lessons", lessonId, "questions"),
                questionData
            );
        }
    };


    // const saveQuestionsToLesson = async (
    //     lessonId,
    //     rows,
    //     selectedDifficulty,
    //     selectedLessonType
    // ) => {
    //     for (const row of rows) {
    //         const questionData = {
    //             question: row.question || "",
    //             answer: row.answer || "",
    //             difficulty: selectedDifficulty,
    //             lessonType: selectedLessonType
    //         };

    //         if (
    //             selectedLessonType === "multiple_choice" ||
    //             selectedLessonType === "image_identification"
    //         ) {
    //             questionData.type = "multiple_choice";
    //             questionData.choices = row.choices
    //                 ? row.choices.split(";").map((choice) => choice.trim())
    //                 : [];

    //             if (selectedLessonType === "image_identification") {
    //                 if (!row.imageUrl) {
    //                     throw new Error(
    //                         "Each image identification question must include an image_url in the CSV."
    //                     );
    //                 }

    //                 try {
    //                     new URL(row.imageUrl);
    //                 } catch (error) {
    //                     throw new Error(
    //                         `Invalid image_url in CSV: ${row.imageUrl}`
    //                     );
    //                 }

    //                 questionData.imageUrl = row.imageUrl;
    //             }
    //         } else if (
    //             selectedLessonType === "spelling" ||
    //             selectedLessonType === "phrase_typing"
    //         ) {
    //             questionData.type = "text_input";
    //         } else if (
    //             selectedLessonType === "pronunciation" ||
    //             selectedLessonType === "phrase_speaking"
    //         ) {
    //             questionData.type = "speech_input";
    //         } else {
    //             questionData.type = "text_input";
    //         }

    //         await addDoc(
    //             collection(db, "lessons", lessonId, "questions"),
    //             questionData
    //         );
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

    useEffect(() => {
        fetchLessons();
    }, []);

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
            alert("Please select a category");
            return;
        }

        if (!pathway) {
            alert("Please select a pathway");
            return;
        }

        if (!lessonType) {
            alert("Please select a lesson type");
            return;
        }

        if (!editingId && !csvFile) {
            alert("Please upload a CSV file");
            return;
        }

        if (fileError) {
            alert("Please upload a valid CSV file.");
            return;
        }

        try {
            if (editingId) {
                await updateDoc(doc(db, "lessons", editingId), {
                    title: lessonTitle,
                    difficulty,
                    category,
                    pathway,
                    lessonType
                });

                alert("Lesson updated successfully!");
            } else {
                const lessonRef = await addDoc(collection(db, "lessons"), {
                    title: lessonTitle,
                    difficulty,
                    category,
                    pathway,
                    lessonType,
                    createdAt: serverTimestamp()
                });

                const lessonId = lessonRef.id;

                if (csvFile) {
                    const parsedRows = await parseCSVFile(csvFile);

                    await saveQuestionsToLesson(
                        lessonId,
                        parsedRows,
                        difficulty,
                        lessonType
                    );

                    alert("Lesson and questions added successfully!");
                } else {
                    alert("Lesson added successfully!");
                }
            }

            await fetchLessons();
            resetForm();
        } catch (error) {
            console.error("Error saving lesson:", error);
            alert(error.message || "Something went wrong.");
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Delete this lesson?");

        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "lessons", id));
            fetchLessons();
        } catch (error) {
            console.error("Error deleting lesson:", error);
        }
    };

    const handleEdit = (lesson) => {
        setLessonTitle(lesson.title || "");
        setDifficulty(lesson.difficulty || "");
        setCategory(lesson.category || "");
        setPathway(lesson.pathway || "");
        setLessonType(lesson.lessonType || "");
        setCsvFile(null);
        setFileError("");
        setEditingId(lesson.id);
        setShowModal(true);
    };

    return (
        <div className="lessons-cont">
            <div className="lesson-header">
                <h1>Lesson Management</h1>

                <div className="lesson-buttons-cont">
                    <button
                        className="lesson-add-button"
                        onClick={() => setShowModal(true)}
                    >
                        + Create Lesson
                    </button>
                </div>
            </div>

            <div className="lesson-table-card">
                <div className="lesson-table-head">
                    <span>Lesson Title</span>
                    <span>Difficulty</span>
                    <span>Category</span>
                    <span>Pathway</span>
                    <span>Lesson Type</span>
                    <span>Actions</span>
                </div>

                <div className="lesson-list-cont">
                    {lessons.length === 0 ? (
                        <p className="empty-state">No lessons found.</p>
                    ) : (
                        lessons.map((lesson) => (
                            <div key={lesson.id} className="lesson-row">
                                <span className="lesson-title">{lesson.title}</span>
                                <span>{formatLabel(lesson.difficulty)}</span>
                                <span>{formatLabel(lesson.category)}</span>
                                <span>{formatLabel(lesson.pathway)}</span>
                                <span>{formatLabel(lesson.lessonType)}</span>

                                <div className="lesson-actions">
                                    <button
                                        className="icon-button edit"
                                        onClick={() => handleEdit(lesson)}
                                    >
                                        <FiEdit2 />
                                    </button>

                                    <button
                                        className="icon-button delete"
                                        onClick={() => handleDelete(lesson.id)}
                                    >
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
                                <option value="" disabled>
                                    Select Difficulty
                                </option>
                                <option value="easy">Easy</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="hard">Hard</option>
                            </select>

                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    Choose Lesson Category
                                </option>
                                <option value="travel-culture">Travel & Culture</option>
                                <option value="family-friends">Family & Friends</option>
                                <option value="work-business">Work & Business</option>
                                <option value="personal-interest">Personal Interest</option>
                            </select>

                            <select
                                value={pathway}
                                onChange={(e) => setPathway(e.target.value)}
                                required
                                disabled={!category}
                            >
                                <option value="" disabled>
                                    {!category
                                        ? "Select category first"
                                        : "Select pathway"}
                                </option>

                                {category &&
                                    pathwayMap[category]?.map((item) => (
                                        <option key={item} value={item}>
                                            {formatLabel(item)}
                                        </option>
                                    ))}
                            </select>

                            <select
                                value={lessonType}
                                onChange={(e) => setLessonType(e.target.value)}
                                required
                                disabled={!difficulty || difficulty === "easy"}
                            >
                                <option value="" disabled>
                                    {!difficulty
                                        ? "Select difficulty first"
                                        : "Select lesson type"}
                                </option>

                                {difficulty &&
                                    lessonTypeMap[difficulty]?.map((item) => (
                                        <option key={item} value={item}>
                                            {formatLabel(item)}
                                        </option>
                                    ))}
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

                            {lessonType === "image_identification" && (
                                <div className="image-upload-hint">
                                    Easy lessons use image identification. Add an
                                    <code> image_url </code>
                                    column to the CSV with the direct image link for
                                    each question.
                                </div>
                            )}

                            <div className="modal-buttons">
                                <button
                                    type="submit"
                                    disabled={
                                        !lessonTitle.trim() ||
                                        !difficulty ||
                                        !category ||
                                        !pathway ||
                                        !lessonType ||
                                        !!fileError ||
                                        (!editingId && !csvFile)
                                    }
                                >
                                    Save
                                </button>

                                <button
                                    type="button"
                                    onClick={resetForm}
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
