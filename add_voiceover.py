import os
import subprocess
import asyncio
import edge_tts
import re

FFMPEG = r"D:\music\node_modules\ffmpeg-static\ffmpeg.exe"
TEMP_DIR = r"d:\printer\temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

# Punchy, commercial-speed scripts:
# Scene 1 (0s-3.5s): Counter QR
# Scene 2 (3.5s-9s): Phone & Auto Merge
# Scene 3 (9s-13.5s): UPI Payment
# Scene 4 (13.5s-24s): Printer & Outro

SCRIPT_HI = [
    {"target": 0.3, "text": "Printo ke sath apni Xerox shop ko banaiye fully automated!"},
    {"target": 4.0, "text": "Customer QR scan karega, aur Aadhaar card automatically merge ho jayega."},
    {"target": 9.4, "text": "Direct UPI payment seedhe aapke soundbox me, zero percent commission ke sath!"},
    {"target": 14.5, "text": "Aur bina WhatsApp jhanjhat ke page print ho jayega. Aaj hi register karein get printo dot in par."}
]

SCRIPT_EN = [
    {"target": 0.3, "text": "Automate your xerox shop on autopilot with Printo!"},
    {"target": 4.0, "text": "Customers simply scan your QR, and Aadhaar cards auto-merge onto one page."},
    {"target": 9.4, "text": "Instant UPI payment straight to your soundbox, with zero commission!"},
    {"target": 14.5, "text": "Automatic silent printing with zero WhatsApp hassle! Visit get printo dot in today."}
]

def get_audio_duration(file_path):
    res = subprocess.run([FFMPEG, "-i", file_path], stderr=subprocess.PIPE, text=True)
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", line)
            if m:
                return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    return 3.0

async def build_voice_track(script, voice, prefix, total_len=24.8):
    print(f"\n--- Generating {prefix.upper()} Voice ({voice}) ---")
    clips = []
    
    current_time = 0.0
    for idx, item in enumerate(script):
        out_file = os.path.join(TEMP_DIR, f"clean_{prefix}_{idx}.mp3")
        communicate = edge_tts.Communicate(item["text"], voice, rate="+15%", pitch="+0Hz")
        await communicate.save(out_file)
        
        dur = get_audio_duration(out_file)
        start_at = max(item["target"], current_time + 0.3)
        end_at = start_at + dur
        current_time = end_at
        
        print(f"  Clip {idx}: start={start_at:.2f}s, dur={dur:.2f}s, end={end_at:.2f}s -> '{item['text'][:40]}...'")
        clips.append({"file": out_file, "start": start_at, "dur": dur})

    inputs = []
    filter_complex = []
    for idx, c in enumerate(clips):
        inputs.extend(["-i", c["file"]])
        delay_ms = int(c["start"] * 1000)
        filter_complex.append(f"[{idx}]adelay={delay_ms}|{delay_ms}[a{idx}]")
    
    inputs_labels = "".join([f"[a{i}]" for i in range(len(clips))])
    filter_complex.append(f"{inputs_labels}amix=inputs={len(clips)}:dropout_transition=0:normalize=0[mixed]")
    
    out_wav = os.path.join(TEMP_DIR, f"final_{prefix}.wav")
    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", ";".join(filter_complex),
        "-map", "[mixed]",
        "-t", str(total_len),
        out_wav
    ]
    subprocess.run(cmd, check=True)
    return out_wav

def merge_video(video_in, audio_in, video_out):
    cmd = [
        FFMPEG, "-y",
        "-i", video_in,
        "-i", audio_in,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        video_out
    ]
    subprocess.run(cmd, check=True)

async def main():
    LANDSCAPE_IN = r"E:\Printo — Motion Promo.mp4"
    STORY_IN = r"E:\Printo — Story (9-16).mp4"

    audio_hi = await build_voice_track(SCRIPT_HI, "hi-IN-MadhurNeural", "hi")
    merge_video(LANDSCAPE_IN, audio_hi, r"E:\Printo — Promo (Hinglish Voice).mp4")
    merge_video(STORY_IN, audio_hi, r"E:\Printo — Story (Hinglish Voice).mp4")
    print("✅ Hinglish Videos Successfully Overwritten with ZERO Overlap!")

    audio_en = await build_voice_track(SCRIPT_EN, "en-IN-PrabhatNeural", "en")
    merge_video(LANDSCAPE_IN, audio_en, r"E:\Printo — Promo (English Voice).mp4")
    merge_video(STORY_IN, audio_en, r"E:\Printo — Story (English Voice).mp4")
    print("✅ English Videos Successfully Overwritten with ZERO Overlap!")

    print("\n🎉 DONE! All 4 videos in E:\\ now have crystal clear single voice with zero background echo/overlap!")

if __name__ == "__main__":
    asyncio.run(main())
