"""発言抽出 Batch API submit スクリプト

Usage:
    python 01-1_Hatsugen_extraction.py <input_dir> <config_yaml>

入力ディレクトリ内の *.txt / *.pdf ファイルからBatch APIリクエストを生成し、
OpenAI Batch API に投入する。batch_id を標準出力に表示する。
PDFファイルは事前にOpenAIにアップロードし、file_id参照でバッチリクエストに含める。
"""

import argparse
import json
import tempfile
from pathlib import Path
from typing import List

import yaml
from openai import OpenAI
from openai.lib._pydantic import to_strict_json_schema
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


# ===== Pydanticモデル定義（ノートブック準拠） =====
class Hatsugen(BaseModel):
    first_sentence: str
    last_sentence: str


class HatsugenList(BaseModel):
    comments: List[Hatsugen]
    comment_count: int
    prompt_tokens: int
    completion_tokens: int
    cost: float


def load_config(config_path: Path) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_batch_request(
    custom_id: str,
    model_name: str,
    system_prompt: str,
    user_content,
) -> dict:
    """Batch APIリクエスト行を生成する。

    user_content: str（TXT）または list（PDF: file_id参照 + テキスト）
    """
    return {
        "custom_id": custom_id,
        "method": "POST",
        "url": "/v1/responses",
        "body": {
            "model": model_name,
            "input": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "HatsugenList",
                    "schema": to_strict_json_schema(HatsugenList),
                    "strict": True,
                }
            },
        },
    }


def main():
    parser = argparse.ArgumentParser(description="発言抽出 Batch API submit")
    parser.add_argument("input_dir", type=Path, help="入力ファイルのディレクトリ（*.txt, *.pdf）")
    parser.add_argument("config", type=Path, help="設定YAMLファイル")
    args = parser.parse_args()

    config = load_config(args.config)
    model_name = config["model"]["name"]
    system_prompt = config["prompt"]["system"]
    user_template = config["prompt"]["user"]

    # TXT + PDF を収集
    input_files = sorted(
        list(args.input_dir.glob("*.txt")) + list(args.input_dir.glob("*.pdf"))
    )
    if not input_files:
        print(f"エラー: {args.input_dir} にTXT/PDFファイルが見つかりません")
        raise SystemExit(1)

    client = OpenAI()
    uploaded_files = {}  # {ファイル名: file_id} PDFアップロード記録

    # JSONL生成
    jsonl_lines = []
    for input_file in input_files:
        custom_id = input_file.stem
        ext = input_file.suffix.lower()

        if ext == ".txt":
            text_content = input_file.read_text(encoding="utf-8")
            user_content = user_template.replace("{text}", text_content)
        elif ext == ".pdf":
            # PDFをOpenAIにアップロード
            with open(input_file, "rb") as f:
                uploaded = client.files.create(file=f, purpose="user_data")
            uploaded_files[input_file.name] = uploaded.id
            print(f"📤 PDFアップロード: {input_file.name} → {uploaded.id}")

            # user_content をマルチパート形式（file_id参照 + テキスト指示）にする
            user_text = user_template.replace("{text}", "")
            user_content = [
                {"type": "input_file", "file_id": uploaded.id},
                {"type": "input_text", "text": user_text},
            ]

        request_obj = build_batch_request(
            custom_id=custom_id,
            model_name=model_name,
            system_prompt=system_prompt,
            user_content=user_content,
        )
        jsonl_lines.append(json.dumps(request_obj, ensure_ascii=False))
        print(f"✅ 追加: {custom_id} ({ext})")

    print(f"\n📄 リクエスト数: {len(jsonl_lines)}")
    if uploaded_files:
        print(f"📤 アップロード済みPDF: {len(uploaded_files)} 件")

    # テンポラリファイルに書き出し → アップロード → バッチ作成
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".jsonl", encoding="utf-8", delete=False
    ) as tmp:
        tmp.write("\n".join(jsonl_lines))
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            batch_input_file = client.files.create(file=f, purpose="batch")

        batch_job = client.batches.create(
            input_file_id=batch_input_file.id,
            endpoint="/v1/responses",
            completion_window="24h",
            metadata={"description": "発言抽出 (Hatsugen extraction)"},
        )
        print(f"\n🚀 Batch ID: {batch_job.id}")

        # バッチ情報を保存（collect時のPDFファイル削除用）
        batch_info = {
            "batch_id": batch_job.id,
            "input_file_id": batch_input_file.id,
            "uploaded_files": uploaded_files,  # {ファイル名: file_id}
        }
        info_path = Path(f"./output/Hatsugen_{batch_job.id}.json")
        info_path.parent.mkdir(parents=True, exist_ok=True)
        with open(info_path, "w", encoding="utf-8") as f:
            json.dump(batch_info, f, ensure_ascii=False, indent=2)
        print(f"📋 バッチ情報保存: {info_path}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
