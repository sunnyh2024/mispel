const {ObjectId} = require("mongodb");
const fs = require('fs');

// Important functions for adjusting words in database collection
// ==========================================================================
const addWords = async (db, toInsert) => {
    const result =  await db.collection("words").insertMany(toInsert);
    console.log(`${result.insertedCount} new words added with ids: `);
}   

const deleteWords = async (db, toRemove) => {
    const result = await db.collection("words").deleteMany(toRemove);
    console.log(`${result.deletedCount} words deleted`);
} 

const findWords = async (db, toFind) => {
    let count = 0;
    let docs = [];
    const cursor = await db.collection("words").find(toFind);
    cursor.forEach((x) => {
        count+=1;
        docs.push(x);
    });
    console.log(count + " words found");
    console.log(count ? docs : "");
}

const updateWords = async (db, toUpdate, updateTo) => {
    const result = await db.collection("words").updateMany(toUpdate, [{$set: {word: updateTo}}]);
    console.log(`${result.modifiedCount} words updated`);
    return result
}

const getMP3 = async (db) => {
    const mp3 = await db.collection('fat').findOne({_id : ObjectId('62cb66b990eefb72169af51a')})
    const mp3File = new Buffer.from(mp3.value.buffer, 'base64')
    fs.writeFileSync('output_copy.mp3', mp3File);
    return mp3File;
}
// ==========================================================================


// Important functions for rooms data
// ==========================================================================
// Creates room in database containing room, user, and word info
// TODO: do check that there can't be sql injections
const createRoom = async (db, roomName, hostName) => {
    const host = {};
    host[hostName] = 0;
    const wordsArray = await getRandomWords(db, 15);
    // New room structure when added to the database
    const newRoom = {
        roomID: roomName,
        players: host,
            // playerName: 0
        currentWordPosition: 0,
        wordCount: 15,
        words: wordsArray,
            // [{ word: "restaurant", definition: "a place that people go to eat", audio: Binary},
            // { word: "reliable", definition: "adjective describing someone as dependable", audio: Binary},
            // ...]
        attempts: [
            // {"resterant": 3, "retaurent": 3, ...},
            // {"relable": 5, "realable": 2},
            // ...
        ],
        timeLimit: 15,
    };
    try {
        await db.collection("rooms").insertOne(newRoom);
    } catch (err) {
        console.error(err);
    }
} 

// Adds player to players object in database to initialize scores
// TODO: do check that there can't be sql injections
const joinRoom = async (db, roomName, player) => {
    const players = 'players.' + player;
    const addPlayer = { '$set' : {} };
    // Sets new player's score to 0
    addPlayer['$set'][players] = 0;
    try {
        await db.collection("rooms").updateOne(
            { roomID: roomName },
            addPlayer,
            upsert=false,
        );
    } catch (err) {
        console.error(err);
    }
}

// Gets the room's info for words, word count, and time limit
const getRoomInfo = async (db, roomName) => {
    try {
        const result = await db.collection("rooms").find(
            {
              roomID: roomName
            }
        ).toArray();
        const info = {
            words: result[0].words,
            wordCount: result[0].wordCount,
            timeLimit: result[0].timeLimit,
        };
        return info;
    } catch (err) {
        console.error(err);
    }
}

// Updates room settings for words
const updateRoomSettings = async (db, roomName, newWordsCount, newTimeLimit) => {
    try {
        // wordCount, words array, and timeLimit are updated if the passed in numbers are not -1
        if (newWordsCount != -1) {
            const newWordsArray = await getRandomWords(db, newWordsCount);
            await db.collection("rooms").updateOne(
                { roomID: roomName },
                { 
                    $set: {
                        wordCount: newWordsCount,
                        words: newWordsArray,
                    }
                },
                upsert=false,
            );
        }
        if (newTimeLimit != -1) {
            await db.collection("rooms").updateOne(
                { roomID: roomName },
                { 
                    $set: {
                        timeLimit: newTimeLimit,
                    }
                },
                upsert=false,
            );
        }
    } catch (err) {
        console.error(err);
    }
}

// Updates the room scores and misspellings 
const updateRoomGame = async (db, roomName, updatedPlayersScores, attemptsCounts) => {
    try {
        await db.collection("rooms").updateOne(
            { roomID: roomName },
            {
                // Replace with the updated player scores constructed from Sockets
                $set: {
                    players: updatedPlayersScores,
                },
                // Move to the next word position
                $inc: {
                    currentWordPosition: 1,
                },
                // Add new dictionary of misspellings to array of attempts
                $push: {
                    attempts: attemptsCounts,
                },
            },
            upsert=false,
        );
    } catch (err) {
        console.error(err);
    }
}

// Deletes rooms from the database
const deleteRoom = async (db, roomName) => {
    try {
        await db.collection("rooms").deleteOne({ roomID: roomName });
    } catch (err) {
        console.error(err);
    }
}
// ==========================================================================


// Important helper functions
// ==========================================================================
// Randomly selects specific number of words from database's word list to use for the game rooms
const getRandomWords = async (db, number) => {
    try {
        var cursor = (db.collection("words").aggregate([{ $sample: { size: number } }]));
        // Creates array of size 'number'
        const words = (await cursor.toArray());
        words.forEach((word) => {
            delete word._id;
        })
        return words;
    } catch (err) {
        console.error(err);
    }
}
// ==========================================================================

module.exports = {
    addWords,
    findWords,
    deleteWords,
    updateWords,
    getRandomWords,
    getMP3,
    createRoom,
    joinRoom,
    updateRoomSettings,
    updateRoomGame,
    deleteRoom,
    getRoomInfo,
}