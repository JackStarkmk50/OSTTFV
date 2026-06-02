import os
import asyncio
from pathlib import Path


def format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_srt(segments: list) -> str:
    lines = []
    for seg in segments:
        display_text = seg.get("transliterated") or seg.get("text", "")
        lines.append(str(seg["id"] + 1))
        lines.append(f"{format_srt_time(seg['start'])} --> {format_srt_time(seg['end'])}")
        lines.append(display_text)
        lines.append("")
    return "\n".join(lines)


async def burn_subtitles(video_path: str, segments: list, output_path: str) -> str:
    import ffmpeg

    srt_path = output_path.replace(".mp4", ".srt")
    srt_content = generate_srt(segments)
    Path(srt_path).write_text(srt_content, encoding="utf-8")

    loop = asyncio.get_event_loop()

    def _run():
        (
            ffmpeg
            .input(video_path)
            .output(
                output_path,
                vf=f"subtitles='{srt_path}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=1,Alignment=2'",
                acodec="copy",
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return output_path

    await loop.run_in_executor(None, _run)
    return output_path
