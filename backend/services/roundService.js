function validateDragDrop(correctanswer, selectedAnswer) {
    const sortedCorrect = [...correctanswer].sort((a, b) => a.position - b.position);
    const sortedSelected = [...selectedAnswer].sort((a, b) => a.position - b.position);

    return sortedCorrect.every((correctItem, index) =>
        sortedSelected[index] &&
        Number(correctItem.id) === Number(sortedSelected[index].id) &&
        Number(correctItem.position) === Number(sortedSelected[index].position)
    );
}

async function selectRoundByDifficulty(pool, req, res) {
    const difficultyOrder = ['easy', 'medium', 'hard'];
    const difficultyLevel = req.query.difficulty;

    const requestedIndex = difficultyOrder.indexOf(difficultyLevel.toLowerCase());

    if (requestedIndex === -1) {
        return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    try {
        for (let i = requestedIndex; i < difficultyOrder.length; i++) {
            const currentLevel = difficultyOrder[i];

            const rounds = await pool.query(
                `SELECT roundID, qBankID, difficultyLevel, status
                 FROM Rounds
                 WHERE difficultyLevel = $1 AND status = 'incomplete'`,
                [currentLevel]
            );

            if (rounds.rows.length > 0) {
                console.log(`Found ${rounds.rows.length} round(s) for difficulty '${currentLevel}'`);
                const randomRound = rounds.rows[Math.floor(Math.random() * rounds.rows.length)];
                console.log('Selected Round:', randomRound);
                return res.json(randomRound);
            }

            console.log(`No rounds found for difficulty '${currentLevel}', trying next...`);
        }

        return res.status(404).json({ message: 'No rounds available for any difficulty.' });

    } catch (error) {
        console.error('Error selecting round:', error);
        res.status(500).json({ message: 'Error selecting round' });
    }
}

async function retrieveQuestionBank(pool, req, res) {
    const { QBankID } = req.query;

    if (!QBankID) {
        return res.status(400).json({ message: 'QBankID is required' });
    }

    try {
        const result = await pool.query('SELECT * FROM QuestionBank WHERE QBankID = $1', [QBankID]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No question bank found' });
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching question bank:', error);
        res.status(500).json({ message: 'Error fetching question bank' });
    }
}

async function getQuestionByIndex(pool, req, res) {
    const { qBankID, questionIndex } = req.query;

    if (!qBankID || questionIndex === undefined) {
        return res.status(400).json({ message: 'qBankID and questionIndex are required' });
    }

    try {
        const result = await pool.query(
            `SELECT questionid, questiontext, questiontype, answerOptions, additionalData
             FROM Questions
             WHERE qBankID = $1
             ORDER BY questionID
             OFFSET $2 LIMIT 1`,
            [qBankID, questionIndex]
        );

        console.log('Question to return:', result.rows);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({ message: 'Error fetching question' });
    }
}

async function validateAnswer(pool, req, res) {
    const { questionID, selectedAnswer } = req.body;

    console.log('Validating Answer:', selectedAnswer);
    console.log('Question ID:', questionID);

    if (!questionID) {
        return res.status(400).json({ message: 'questionID is required' });
    }

    try {
        const result = await pool.query(
            'SELECT questiontype, correctanswer FROM questions WHERE QuestionID = $1',
            [questionID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Question not found' });
        }

        let { questiontype, correctanswer } = result.rows[0];
        console.log('Question Type:', questiontype);
        console.log('Correct Answer from DB (Raw):', correctanswer);

        try {
            if (typeof correctanswer === 'string' && (correctanswer.startsWith('{') || correctanswer.startsWith('['))) {
                correctanswer = JSON.parse(correctanswer);
                console.log('Correct Answer (Parsed):', correctanswer);
            }
        } catch (err) {
            console.warn('Could not parse correctanswer:', correctanswer);
        }

        let isCorrect = false;

        switch (questiontype) {
            case 'drag_drop':
                isCorrect = validateDragDrop(correctanswer, selectedAnswer);
                break;
            case 'fillInTheBlank':
            case 'multipleChoice':
            case 'trueFalse':
                isCorrect = selectedAnswer === correctanswer;
                break;
            default:
                return res.status(400).json({ message: `Unsupported question type: ${questiontype}` });
        }

        console.log('Final Comparison Result:', isCorrect);
        res.json({ isCorrect });

    } catch (error) {
        console.error('Error validating answer:', error);
        res.status(500).json({ message: 'Error validating answer' });
    }
}

module.exports = {
    selectRoundByDifficulty,
    retrieveQuestionBank,
    getQuestionByIndex,
    validateAnswer,
};
