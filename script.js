let processor = {
    videos: [],
    canvases: [],
    contexts: [],

    timerCallback: function(index) {
        if (this.videos[index].paused || this.videos[index].ended) {
            return;
        }
        this.computeFrame(index);
        let self = this;
        setTimeout(function () { self.timerCallback(index); }, 0);
    },

    doLoad: function() {
        this.videos = document.getElementsByClassName("video");
        this.canvases = document.getElementsByClassName("canvas");

        for (let i = 0; i < this.videos.length; i++) {
            this.contexts[i] = this.canvases[i].getContext("2d");

            let self = this;
            this.videos[i].addEventListener("play", function() {
                self.timerCallback(i);
            }, false);
        }
    },

    computeFrame: function(index) {
        let video = this.videos[index];
        let ctx = this.contexts[index];
        let width = video.videoWidth;
        let height = video.videoHeight;

        ctx.drawImage(video, 0, 0, width, height);
        let frame = ctx.getImageData(0, 0, width, height);
        frame = this.detectEdge(frame);
        ctx.putImageData(frame, 0, 0);
    },

    detectEdge: function(frame) {
        const h = frame.height;
        const w = frame.width;
        const length = frame.data.length;
        let ans = new ImageData(w, h);

        // Convert to grayscale
        for (let i = 0; i < length; i += 4) {
            let gray = 0.3 * frame.data[i] + 0.59 * frame.data[i + 1] + 0.11 * frame.data[i + 2];
            frame.data[i] = frame.data[i + 1] = frame.data[i + 2] = gray;
        }

        // Sobel edge detection
        for (let y = 1; y < h - 1; ++y) {
            for (let x = 1; x < w - 1; ++x) {
                let i = (y * w + x) << 2;
                let gx = -frame.data[i - 4 - (w << 2)] - 2 * frame.data[i - 4] - frame.data[i - 4 + (w << 2)]
                        + frame.data[i + 4 - (w << 2)] + 2 * frame.data[i + 4] + frame.data[i + 4 + (w << 2)];
                let gy = -frame.data[i - 4 - (w << 2)] - 2 * frame.data[i - (w << 2)] - frame.data[i + 4 - (w << 2)]
                        + frame.data[i - 4 + (w << 2)] + 2 * frame.data[i + (w << 2)] + frame.data[i + 4 + (w << 2)];
                let mag = Math.sqrt(gx * gx + gy * gy) > 100 ? 255 : 0;
                ans.data[i] = ans.data[i + 1] = ans.data[i + 2] = mag;
                ans.data[i + 3] = 255;
            }
        }

        return ans;
    },
};

document.addEventListener("DOMContentLoaded", () => {
    processor.doLoad();
});
