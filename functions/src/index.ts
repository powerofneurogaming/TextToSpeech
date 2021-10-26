import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as textToSpeech from "@google-cloud/text-to-speech";

admin.initializeApp();

// upgrade/downgrade users
export const upgradeUserAdmin = functions.firestore
.document("custom_permissions/{docId}")
.onCreate( async (snapshot, context) => {
    try {
        const userRecord = await admin
        .auth()
        .getUserByEmail(snapshot.data().email);
        return admin.auth()
        .setCustomUserClaims(userRecord.uid, {admin: true});
    } catch (error) {
        console
        .log("Error upgrading email. Email probably just typed wrong.");
    }
});
export const downgradeUserAdmin = functions.firestore
.document("custom_permissions/{docId}")
.onDelete( async (snapshot, context) => {
    try {
        const userRecord = await admin
        .auth()
        .getUserByEmail(snapshot.data().email);
        return admin.auth()
        .setCustomUserClaims(userRecord.uid, {admin: true});
    } catch (error) {
        console
        .log("Error upgrading email. Email probably just typed wrong.");
    }
});

// will translate the text in document tab like
//  {text: "Go cubs go!"}
// mp3 file name is the document id
export const handleTextAdded = functions.firestore
    .document("text-to-tts/{docId}")
    .onWrite(async (change, context) => {
        try {
            const req = change.after.exists ? change.after.data() : null;
            if (req == null) {
                return Promise.resolve();
            }
            const text = req?.text;
            const ssml = req?.ssml;

            const client = new textToSpeech.TextToSpeechClient();

            const request = {
                input: {text: text, ssml: ssml},
                voice: {
                    languageCode: "en-au",
                    name: "en-AU-Wavenet-D",
                    ssmlGender: <const> "MALE",
                },
                audioConfig: {audioEncoding: <const> "MP3"},
            };

            const options = {
                metadata: {
                    contentType: "audio/mpeg",
                    metadata: {
                        source: "Google Text-to-Speech",
                    },
                },
            };

            const [response] = await client.synthesizeSpeech(request);
            console.log("Audio content successfully translated " +
            response.audioContent?.length);

            const bucket = admin.storage().bucket();
            const target = bucket.file(context.params.docId+".mp3");
            return target
                .save(response.audioContent as Buffer || "",
                    options);
        } catch (error) {
            console.log(error);
            return Promise.resolve();
        }
});
