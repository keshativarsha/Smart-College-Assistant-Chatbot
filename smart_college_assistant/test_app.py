import unittest
import io
import json
import tempfile
import shutil
from pathlib import Path

import app

class SmartCollegeAssistantTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing with an isolated temporary database and upload directory
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)
        app.DB_PATH = self.temp_path / "test_college_assistant.db"
        app.UPLOAD_DIR = self.temp_path / "uploads"
        app.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        app.app.config["TESTING"] = True
        app.init_db()
        self.client = app.app.test_client()

    def tearDown(self):
        # Cleanup temporary files
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("status"), "ok")

    def test_home_page(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Smart College Assistant", response.data)

    def test_conversational_chat_intents(self):
        # Test greeting
        res = self.client.post("/api/chat", json={"message": "hello"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("Hello!", res.get_json()["answer"])

        # Test capability inquiry
        res = self.client.post("/api/chat", json={"message": "What can you do?"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("Here is what I can do", res.get_json()["answer"])

        # Test polite farewell
        res = self.client.post("/api/chat", json={"message": "bye"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("Goodbye!", res.get_json()["answer"])

    def test_chat_empty_input_validation(self):
        res = self.client.post("/api/chat", json={"message": "   "})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_chat_without_documents(self):
        res = self.client.post("/api/chat", json={"message": "What is the exam timetable?"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("No college documents have been uploaded", data["answer"])
        self.assertFalse(data["grounded"])

    def test_document_upload_validation(self):
        # Missing file field
        res = self.client.post("/api/documents", data={})
        self.assertEqual(res.status_code, 400)

        # Disallowed file type
        res = self.client.post(
            "/api/documents",
            data={"file": (io.BytesIO(b"malicious content"), "program.exe")}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only PDF, TXT, and MD files are supported", res.get_json()["error"])

    def test_document_upload_and_retrieval(self):
        # 1. Upload valid document
        sample_text = (
            "PLACEMENT NOTICE 2026\n"
            "Final year students with minimum 6.5 CGPA and no backlogs are eligible for campus placements.\n"
            "Registration deadline is 30 October 2026. Keep resume and college ID ready."
        )
        res = self.client.post(
            "/api/documents",
            data={"file": (io.BytesIO(sample_text.encode("utf-8")), "placement_notice.txt")}
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("placement_notice.txt", res.get_json()["filename"])

        # 2. Check document is listed
        list_res = self.client.get("/api/documents")
        self.assertEqual(list_res.status_code, 200)
        docs = list_res.get_json()
        self.assertEqual(len(docs), 1)
        doc_id = docs[0]["id"]

        # 3. Ask question matching document
        chat_res = self.client.post(
            "/api/chat",
            json={"message": "What is the placement CGPA eligibility criteria?"}
        )
        self.assertEqual(chat_res.status_code, 200)
        chat_data = chat_res.get_json()
        self.assertTrue(chat_data["grounded"])
        self.assertIn("6.5 CGPA", chat_data["answer"])
        self.assertIn("placement_notice.txt", chat_data["sources"])

        # 4. Ask unrelated question expecting safe fallback
        unrelated_res = self.client.post(
            "/api/chat",
            json={"message": "How do I bake a chocolate cake?"}
        )
        self.assertEqual(unrelated_res.status_code, 200)
        unrelated_data = unrelated_res.get_json()
        self.assertFalse(unrelated_data["grounded"])
        self.assertIn("couldn't find a reliable answer", unrelated_data["answer"])

        # 5. Delete document
        del_res = self.client.delete(f"/api/documents/{doc_id}")
        self.assertEqual(del_res.status_code, 200)

        # Confirm list is empty
        list_res2 = self.client.get("/api/documents")
        self.assertEqual(len(list_res2.get_json()), 0)

    def test_task_tracker_crud_and_validation(self):
        # 1. Validation: Missing title
        res = self.client.post("/api/tasks", json={"due_date": "2026-11-15", "category": "Exam"})
        self.assertEqual(res.status_code, 400)

        # 2. Validation: Invalid date format
        res = self.client.post("/api/tasks", json={"title": "Midterm Exam", "due_date": "not-a-date"})
        self.assertEqual(res.status_code, 400)

        # 3. Add valid task
        res = self.client.post(
            "/api/tasks",
            json={"title": "Final Year Project Review", "due_date": "2026-11-20", "category": "Assignment"}
        )
        self.assertEqual(res.status_code, 201)
        task_data = res.get_json()
        task_id = task_data["id"]
        self.assertEqual(task_data["title"], "Final Year Project Review")

        # 4. List tasks
        list_res = self.client.get("/api/tasks")
        self.assertEqual(list_res.status_code, 200)
        tasks = list_res.get_json()
        self.assertEqual(len(tasks), 1)

        # 5. Delete task
        del_res = self.client.delete(f"/api/tasks/{task_id}")
        self.assertEqual(del_res.status_code, 200)

        # 6. Delete non-existent task returns 404
        del_res_404 = self.client.delete(f"/api/tasks/{task_id}")
        self.assertEqual(del_res_404.status_code, 404)

if __name__ == "__main__":
    unittest.main()
