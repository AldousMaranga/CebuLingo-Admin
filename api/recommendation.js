const OpenAI = require('openai');

const model = process.env.OPENAI_RECOMMENDATION_MODEL || 'openai/gpt-oss-20b';
const apiKey = process.env.GROQ_API_KEY;

const client = apiKey ? new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
}) : null;

function sendJson(response, statusCode, payload) {
    response.status(statusCode).json(payload);
}

function buildPrompt(payload) {
    return JSON.stringify({
        question_text: payload.questionText || '',
        prompt_text: payload.promptText || '',
        correct_answer: payload.correctAnswer || '',
        user_answer: payload.userAnswer || '',
        choices: Array.isArray(payload.choices) ? payload.choices : [],
        is_correct: Boolean(payload.isCorrect),
        attempts_used: Number(payload.attemptsUsed || 0),
        attempts_remaining: Number(payload.attemptsRemaining || 0),
        reveal_answer: Boolean(payload.revealAnswer),
        difficulty: payload.difficulty || '',
        lesson_type: payload.lessonType || '',
        question_type: payload.questionType || '',
        has_image: Boolean(payload.hasImage)
    }, null, 2);
}

function buildDashboardPrompt(payload) {
    return JSON.stringify({
        current_category: payload.currentCategory || '',
        current_proficiency: payload.currentProficiency || '',
        current_difficulty: payload.currentDifficulty || '',
        completed_lessons_on_dashboard: Number(payload.completedLessonsOnDashboard || 0),
        completed_visible_lessons: Number(payload.completedVisibleLessons || 0),
        average_visible_score: Number(payload.averageVisibleScore || 0),
        perfect_visible_lessons: Number(payload.perfectVisibleLessons || 0),
        completed_pathways: Array.isArray(payload.completedPathways) ? payload.completedPathways : [],
        recommended_proficiency_options: Array.isArray(payload.recommendedProficiencyOptions)
            ? payload.recommendedProficiencyOptions
            : [],
        available_alternative_pathways: Array.isArray(payload.availableAlternativePathways)
            ? payload.availableAlternativePathways
            : []
    }, null, 2);
}

async function generateRecommendation(payload) {
    if (!client) {
        throw new Error('GROQ_API_KEY is required to run the recommendation API.');
    }

    const isDashboardSuggestion = payload?.task === 'dashboard_pathway_suggestion';

    const response = await client.chat.completions.create({
        model,
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: isDashboardSuggestion
                    ? [
                        'You suggest the next Cebuano learning pathway for a learner who has finished the lessons currently shown on their dashboard.',
                        'Return JSON only with keys: message and tone.',
                        'Tone must be info.',
                        'Write 1 to 2 short sentences that are specific, warm, and motivating.',
                        'Recommend one pathway from available_alternative_pathways only.',
                        'Return recommendedPathway as the chosen pathway name, exactly matching one provided option.',
                        'Return recommendedProficiency as one of the provided recommended_proficiency_options when a promotion makes sense, otherwise return the current proficiency.',
                        'Explain briefly why that pathway is a good next step and how it gives the learner a different kind of practice.',
                        'Use the performance summary to judge whether the learner seems ready for a harder difficulty.',
                        'If a starter lesson title is provided, mention it naturally.',
                        'Do not invent pathways, lesson titles, or categories that were not provided.',
                        'Avoid generic advice like "keep going" unless it is paired with a concrete next direction.',
                        'Avoid emojis, quotation marks unless needed, and avoid sounding robotic.'
                    ].join(' ')
                    : [
                        'You write micro-feedback for a Cebuano learning quiz.',
                        'Return JSON only with keys: message, tone, recommendedPathway, and recommendedProficiency.',
                        'Tone must be one of: success, warning.',
                        'For quiz feedback, always return empty strings for recommendedPathway and recommendedProficiency.',
                        'If correct, write one short encouraging line of 5 to 14 words.',
                        'If incorrect, write 1 to 2 short sentences, practical and friendly.',
                        'Vary wording naturally so repeated answers do not sound identical.',
                        'Do not reveal the correct answer unless reveal_answer is true.',
                        'When reveal_answer is false, give an indirect clue that leads toward the answer without saying it.',
                        'For every incorrect response, include at least one concrete clue about the correct answer.',
                        'Prefer semantic clues when possible, such as category, common use, place, behavior, association, or function.',
                        'Do not give generic advice by itself, such as "read the clue again" or "look more carefully", unless it is paired with a specific clue.',
                        'Choose clues that are helpful but not too obvious: specific enough to guide, not specific enough to directly reveal.',
                        'If the answer is an animal, prefer clues like habitat, role, food, sound, or use, instead of broad labels alone.',
                        'If the answer is an object, prefer clues like purpose, location, material, or a visible trait.',
                        'If the answer is food, prefer clues like taste, where it is commonly eaten, ingredient type, or when people eat it.',
                        'If choices are available, use them to hint at the distinguishing trait that separates the correct answer from the wrong ones.',
                        'Example: if the answer is pig, a good clue could be that it is a farm animal or a commonly eaten meat.',
                        'Do not use the answer word, obvious synonyms, translations, or near-spellings when reveal_answer is false.',
                        'When helpful, use the available choices to make the clue more specific.',
                        'Make the hint match the question type.',
                        'For image questions, point the learner back to visible features in the picture.',
                        'For spelling questions, prefer hints about letter count, starting sound, or spelling pattern.',
                        'For pronunciation questions, prefer hints about rhythm, syllables, or saying the word more slowly.',
                        'For phrase typing or phrase pronunciation, prefer hints about word order, number of words, or the main keyword in the clue.',
                        'For regular multiple-choice text questions, guide the learner to the exact clue meaning, not just the category.',
                        'When reveal_answer is true, you may briefly state the correct answer because the app is about to move on.',
                        'If attempts_remaining is more than 0, encourage another try.',
                        'If attempts_remaining is 0, briefly close the feedback because the app will move on.',
                        'Avoid emojis, quotation marks unless needed, and avoid sounding robotic.'
                    ].join(' ')
            },
            {
                role: 'user',
                content: isDashboardSuggestion
                    ? `Dashboard progression context:\n${buildDashboardPrompt(payload)}`
                    : `Quiz context:\n${buildPrompt(payload)}`
            }
        ],
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: isDashboardSuggestion ? 'dashboard_path_suggestion' : 'quiz_feedback',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        message: { type: 'string' },
                        tone: { type: 'string', enum: ['success', 'warning', 'info'] },
                        recommendedPathway: { type: 'string' },
                        recommendedProficiency: { type: 'string' }
                    },
                    required: ['message', 'tone', 'recommendedPathway', 'recommendedProficiency']
                }
            }
        }
    });

    const outputText = response.choices?.[0]?.message?.content || '{}';
    return JSON.parse(outputText);
}

module.exports = async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        response.status(204).end();
        return;
    }

    if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
    }

    try {
        const payload = request.body && typeof request.body === 'object' ? request.body : {};
        const recommendation = await generateRecommendation(payload);
        sendJson(response, 200, recommendation);
    } catch (error) {
        console.error('Recommendation generation failed.', error);
        sendJson(response, 500, { error: 'Recommendation generation failed.' });
    }
};
