#!/usr/bin/env node

"use strict";

const { MongoClient } = require("mongodb");
const { db } = require("../config/config");

const USERS_TO_INSERT = [
    {
        "_id": 1,
        "userName": "admin",
        "firstName": "Node Goat",
        "lastName": "Admin",
        "password": "Admin_123",
        "isAdmin": true
    },
    {
        "_id": 2,
        "userName": "user1",
        "firstName": "John",
        "lastName": "Doe",
        "benefitStartDate": "2030-01-10",
        "password": "User1_123"
    },
    {
        "_id": 3,
        "userName": "user2",
        "firstName": "Will",
        "lastName": "Smith",
        "benefitStartDate": "2025-11-30",
        "password": "User2_123"
    }
];

const tryDropCollection = (database, name) => {
    return new Promise((resolve) => {
        database.dropCollection(name)
            .then(() => {
                console.log(`Dropped collection: ${name}`);
                resolve();
            })
            .catch(() => {
                // Ignore errors (e.g., collection doesn't exist)
                resolve();
            });
    });
};

const parseResponse = (err, res, comm) => {
    if (err) {
        console.log("ERROR:");
        console.log(comm);
        console.log(JSON.stringify(err));
        process.exit(1);
    }
    console.log(comm);
    console.log(JSON.stringify(res));
};

MongoClient.connect(db, {}, async (err, client) => {
    if (err) {
        console.log("ERROR: connect");
        console.log(JSON.stringify(err));
        process.exit(1);
    }

    console.log("Connected to the database");
    const database = client.db(); // gets DB instance

    const collectionNames = [
        "users",
        "allocations",
        "contributions",
        "memos",
        "counters"
    ];

    console.log("Dropping existing collections");
    await Promise.all(collectionNames.map((name) => tryDropCollection(database, name)));

    const usersCol = database.collection("users");
    const allocationsCol = database.collection("allocations");
    const countersCol = database.collection("counters");

    console.log("Resetting counters");
    await countersCol.insertOne({
        _id: "userId",
        seq: 3
    });

    console.log("Users to insert:");
    USERS_TO_INSERT.forEach((user) => console.log(JSON.stringify(user)));

    const userInsertResult = await usersCol.insertMany(USERS_TO_INSERT);
    parseResponse(null, userInsertResult, "users.insertMany");

    const finalAllocations = userInsertResult.insertedIds
        ? Object.values(userInsertResult.insertedIds).map((id, idx) => {
            const stocks = Math.floor((Math.random() * 40) + 1);
            const funds = Math.floor((Math.random() * 40) + 1);
            return {
                userId: USERS_TO_INSERT[idx]._id,
                stocks: stocks,
                funds: funds,
                bonds: 100 - (stocks + funds)
            };
        })
        : [];

    console.log("Allocations to insert:");
    finalAllocations.forEach(a => console.log(JSON.stringify(a)));

    const allocInsertResult = await allocationsCol.insertMany(finalAllocations);
    parseResponse(null, allocInsertResult, "allocations.insertMany");

    console.log("Database reset performed successfully");
    client.close();
    process.exit(0);
});
