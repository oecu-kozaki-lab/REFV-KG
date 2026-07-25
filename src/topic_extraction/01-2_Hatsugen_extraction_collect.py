"""発言抽出 Batch API collect スクリプト

Usage:
    python 01-2_Hatsugen_extraction_collect.py <batch_id> <output_dir>

バッチジョブのステータスを確認し、完了していたら結果をダウンロードして
出力ディレクトリにファイルごとのJSONを保存する。
"""

import argparse
import json
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def parse_batch_output(response_body: dict) -> dict | None:
    """Responses API のバッチ結果からoutput_textを抽出してJSONパースする"""
    output = response_body.get("output", [])
    for item in output:
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    return json.loads(content["text"])
    return None


def main():
    parser = argparse.ArgumentParser(description="発言抽出 Batch API collect")
    parser.add_argument("batch_id", type=str, help="Batch ID")
    parser.add_argument("output_dir", type=Path, help="出力ディレクトリ")
    args = parser.parse_args()

    client = OpenAI()

    batch_job = client.batches.retrieve(args.batch_id)
    print(f"ステータス: {batch_job.status}")

    if batch_job.status not in ("completed", "failed"):
        print("バッチジョブが未完了です。後で再実行してください。")
        raise SystemExit(0)

    # バッチジョブの詳細を表示
    print(f"  request_counts: completed={batch_job.request_counts.completed}, failed={batch_job.request_counts.failed}, total={batch_job.request_counts.total}")
    print(f"  output_file_id: {batch_job.output_file_id}")
    print(f"  error_file_id: {batch_job.error_file_id}")

    # エラーファイルがあれば表示
    if batch_job.error_file_id:
        print("\n❌ エラーファイルの内容:")
        error_file = client.files.content(batch_job.error_file_id)
        for line in error_file.iter_lines():
            error_data = json.loads(line)
            print(json.dumps(error_data, ensure_ascii=False, indent=2))

    if not batch_job.output_file_id:
        print("\n⚠️ output_file_id がありません（全件エラーの可能性）")
        raise SystemExit(1)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    result_file = client.files.content(batch_job.output_file_id)

    saved_count = 0
    error_count = 0

    for line in result_file.iter_lines():
        data = json.loads(line)
        custom_id = data.get("custom_id", "unknown")

        try:
            parsed = parse_batch_output(data["response"]["body"])
            if parsed is None:
                print(f"⚠️ パースエラー: {custom_id}")
                error_count += 1
                continue

            output_path = args.output_dir / f"{custom_id}.json"
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)

            print(f"✅ 保存: {output_path.name}")
            saved_count += 1

        except Exception as e:
            print(f"❌ エラー: {custom_id} - {e}")
            error_count += 1

    print(f"\n📊 結果: {saved_count} 件保存, {error_count} 件エラー")

    # バッチ情報ファイルがあればアップロード済みPDFを削除
    batch_info_path = Path(f"./output/Hatsugen_{args.batch_id}.json")
    if batch_info_path.exists():
        with open(batch_info_path, "r", encoding="utf-8") as f:
            batch_info = json.load(f)

        uploaded_files = batch_info.get("uploaded_files", {})
        if uploaded_files:
            print(f"\n🗑️ アップロード済みPDF {len(uploaded_files)} 件を削除中...")
            for filename, file_id in uploaded_files.items():
                try:
                    client.files.delete(file_id)
                    print(f"  削除: {filename} ({file_id})")
                except Exception as e:
                    print(f"  ⚠️ 削除失敗: {filename} ({file_id}) - {e}")

        print(f"📋 バッチ情報ファイル削除: {batch_info_path}")
        batch_info_path.unlink()


if __name__ == "__main__":
    main()
