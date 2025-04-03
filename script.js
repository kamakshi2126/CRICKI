let isRunning = false;
let detector = null;
let videoStream = null;

async function initPoseEstimation() {
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("output");
    const ctx = canvas.getContext("2d");
    const statusMessage = document.getElementById("statusMessage");

    if (!isRunning) {
        statusMessage.innerText = "Loading model... Please wait.";

        // Start video stream
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;

        video.addEventListener("loadeddata", async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Load MoveNet MultiPose Model (only once)
            if (!detector) {
                detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
                    modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
                });
            }

            statusMessage.innerText = "Pose Estimation is running...";

            async function detectPose() {
                if (!isRunning) return;

                const poses = await detector.estimatePoses(video, { flipHorizontal: true });

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Draw all detected persons
                poses.forEach(pose => drawKeypointsAndSkeleton(pose, ctx));

                requestAnimationFrame(detectPose);
            }

            detectPose();
        });
    } else {
        // Stop the webcam and clear canvas
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusMessage.innerText = "Click 'Start Pose Estimation' to begin.";
    }

    isRunning = !isRunning;
    document.getElementById("toggleButton").innerText = isRunning ? "Stop Pose Estimation" : "Start Pose Estimation";
}

function drawKeypointsAndSkeleton(pose, ctx) {
    const keypoints = pose.keypoints;

    // Draw keypoints
    keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
        }
    });

    // Define connections between keypoints
    const adjacentPairs = [
        [0, 1], [1, 3], [3, 5], // Right arm
        [0, 2], [2, 4], [4, 6], // Left arm
        [5, 7], [7, 9], // Right leg
        [6, 8], [8, 10], // Left leg
        [5, 6], [11, 12], // Hip line
        [5, 11], [6, 12], // Hip to knee
        [11, 13], [13, 15], // Right leg
        [12, 14], [14, 16]  // Left leg
    ];

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;

    // Draw skeleton
    adjacentPairs.forEach(([i, j]) => {
        if (keypoints[i].score > 0.5 && keypoints[j].score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(keypoints[i].x, keypoints[i].y);
            ctx.lineTo(keypoints[j].x, keypoints[j].y);
            ctx.stroke();
        }
    });
}

document.getElementById("toggleButton").addEventListener("click", initPoseEstimation);


