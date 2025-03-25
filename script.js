
let processor = {
    timerCallback: function() {
        if (this.video.paused || this.video.ended) {
            return;
        }
        this.computeFrame();
        let self = this;
        setTimeout(function () { self.timerCallback(); }, 0);
    },

    doLoad: function() {
        this.video = document.getElementById("video");
        this.can = document.getElementById("canvas");
        this.ctx = this.can.getContext("2d");
        let self = this;
        this.video.addEventListener("play", function() {
                self.width = self.video.videoWidth;
                self.height = self.video.videoHeight;
                self.timerCallback();
            }, false
        );
    },

    computeFrame: function() {
        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        let frame = this.ctx.getImageData(0, 0, this.width, this.height);
        frame = this.detectEdge(frame);
        this.ctx.putImageData(frame, 0, 0);
        return;
    },

    detectEdge: function(frame) {
        const h = frame.height;
        const w = frame.width;
        const length = frame.data.length;
        let ans = new ImageData(w, h);

        // Convert to grayscale
        for (let i = 0; i < length; i += 4) {
            let r = frame.data[i];
            let g = frame.data[i + 1];
            let b = frame.data[i + 2];

            let gray = 0.3 * r + 0.59 * g + 0.11 * b;

            frame.data[i] = gray;
            frame.data[i + 1] = gray;
            frame.data[i + 2] = gray;
        }

        // Sobel edge detection
        for (let y = 1; y < h - 1; ++y) {
            for (let x = 1; x < w - 1; ++x) {
                let i = (y * w + x) << 2;
                let gx = -frame.data[i - 4 - (w<<2)] - 2 * frame.data[i - 4] - frame.data[i - 4 + (w<<2)] +
                          frame.data[i + 4 - (w<<2)] + 2 * frame.data[i + 4] + frame.data[i + 4 + (w<<2)];
                let gy = -frame.data[i - 4 - (w<<2)] - 2 * frame.data[i - (w<<2)] - frame.data[i + 4 - (w<<2)] +
                          frame.data[i - 4 + (w<<2)] + 2 * frame.data[i + (w<<2)] + frame.data[i + 4 + (w<<2)];
                let mag = Math.sqrt(gx * gx + gy * gy) > 100 ? 255 : 0;
                ans.data[i + 0] = mag;
                ans.data[i + 1] = mag;
                ans.data[i + 2] = mag;
                ans.data[i + 3] = 255;
            }
        }

        return ans;
    },
};

document.addEventListener("DOMContentLoaded", () => {
    processor.doLoad();
});

