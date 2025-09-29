// convex/importActions.ts
"use node";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const getUploadUrl = action({
    args: {
        userId: v.id("users"),
        fileName: v.string(),
        contentType: v.string(),
    },
    handler: async (ctx, args) => {
        const s3 = new S3Client({
            region: "auto",
            endpoint: process.env.R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
            forcePathStyle: true,
            requestHandler: new NodeHttpHandler(),
        });

        const key = `imports/${args.userId}/${Date.now()}-${args.fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            ContentType: args.contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

        return { uploadUrl, fileKey: key };
    },
});

export const getGoalImageUploadUrl = action({
    args: {
        userId: v.id("users"),
        fileName: v.string(),
        contentType: v.string(),
    },
    handler: async (ctx, args) => {
        const s3 = new S3Client({
            region: "auto",
            endpoint: process.env.R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
            forcePathStyle: true,
            requestHandler: new NodeHttpHandler(),
        });

        const key = `goals/${args.userId}/${Date.now()}-${args.fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: key,
            ContentType: args.contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

        return { uploadUrl, fileKey: key };
    },
});