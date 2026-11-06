import os
import sys
import json
import yt_dlp
from faster_whisper import WhisperModel

def get_youtube_subtitles_or_transcribe(youtube_url, output_json_path, lang="uz"):
    ydl_opts_subs = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': [lang, 'en', 'ru', 'uz'],
        'subtitlesformat': 'json3/vtt/srt',
        'outtmpl': os.path.join(os.path.dirname(output_json_path), 'temp_sub')
    }
    
    subtitles_found = False
    try:
        with yt_dlp.YoutubeDL(ydl_opts_subs) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            base_dir = os.path.dirname(output_json_path)
            for f in os.listdir(base_dir):
                if f.startswith('temp_sub') and (f.endswith('.json3') or f.endswith('.vtt') or f.endswith('.srt')):
                    subtitles_found = True
                    # If found, we can parse or convert to our standard json format
                    # For simplicity, if yt-dlp gets subs, we note it
                    break
    except Exception as e:
        print(f"yt-dlp subs error: {e}", file=sys.stderr)

    if not subtitles_found:
        print("No existing subtitles found via yt-dlp. Extracting audio and running faster-whisper...")
        audio_path = os.path.join(os.path.dirname(output_json_path), "audio.mp3")
        
        ydl_opts_audio = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(os.path.dirname(output_json_path), 'temp_audio'),
            'quiet': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts_audio) as ydl:
            ydl.extract_info(youtube_url, download=True)
            base_dir = os.path.dirname(output_json_path)
            for f in os.listdir(base_dir):
                if f.startswith('temp_audio') and f.endswith('.mp3'):
                    generated_audio = os.path.join(base_dir, f)
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
                    os.rename(generated_audio, audio_path)
                    break
        
        if os.path.exists(audio_path):
            print(f"Audio extracted successfully: {audio_path}")
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, info = model.transcribe(audio_path, beam_size=5)
            
            result_segments = []
            for segment in segments:
                start_sec = segment.start
                end_sec = segment.end
                text = segment.text.strip()
                result_segments.append({
                    "start": start_sec,
                    "end": end_sec,
                    "text": text
                })
                print(f"[{format_time(start_sec)} --> {format_time(end_sec)}] {text}")
                
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump(result_segments, f, ensure_ascii=False, indent=2)
                
            try:
                os.remove(audio_path)
            except:
                pass
        else:
            raise Exception("Failed to extract audio from YouTube link.")

def format_time(seconds):
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{mins:02d}:{secs:02d}.{millis:03d}"

if __name__ == "__main__":
    if len(sys.argv) > 2:
        get_youtube_subtitles_or_transcribe(sys.argv[1], sys.argv[2])
