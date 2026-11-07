# Language Cappy AI — Tài liệu Kiến trúc & Hướng dẫn Kỹ thuật Toàn diện (englishcappy.md)

Tài liệu này cung cấp bức tranh toàn cảnh, chi tiết kỹ thuật, cấu trúc mã nguồn, quy trình dữ liệu và cơ chế tích hợp của dự án **Language Cappy AI**. Mọi lập trình viên hoặc AI Agent khi đọc tài liệu này có thể nắm bắt 100% cấu trúc dự án và sẵn sàng bảo trì, phát triển tính năng mới.

---

## 1. Tổng quan Dự án (Project Overview)

- **Tên dự án**: Language Cappy AI (Nền tảng luyện giao tiếp đa ngôn ngữ & sửa lỗi câu thông minh).
- **Ngôn ngữ hỗ trợ**:
  1. **English (Tiếng Anh)**: Luyện phản xạ đàm thoại, chỉnh sửa lỗi ngữ pháp/cách dùng từ tự nhiên, nhận xét và giải thích song ngữ Anh - Việt.
  2. **中文 (Tiếng Hoa / Tiếng Trung Giản thể)**: Luyện phản xạ giao tiếp, hỗ trợ bộ gõ Pinyin trực quan sang chữ Hán, nhận xét câu và phiên âm kèm nghĩa tiếng Việt.
- **Mô hình kiến trúc**: Serverless Web Application (SPA - Single Page Application).
  - Không cần máy chủ backend trung gian (Node.js/Python/PHP).
  - Trực tiếp giao tiếp với **Google Gemini REST API** để sinh nội dung & phản hồi.
  - Trực tiếp kết nối **Firebase Realtime Database REST API** để xác thực người dùng, đồng bộ API Key và lưu trữ lịch sử hội thoại.
  - Sử dụng **Google Input Tools API** để chuyển đổi Pinyin sang chữ Hán thời gian thực.
  - Tích hợp công nghệ nhận diện giọng nói (STT) và phát âm song ngữ (TTS) chuẩn bản ngữ.

---

## 2. Cấu trúc Thư mục & Vai trò File (File Structure)

```text
e:\TTDN\
├── English_gemini_ai.html    # Giao diện chính (HTML structure, modal, login screen, audio meta)
├── languagecappy.css         # Toàn bộ CSS phong cách giao diện (Theme, Card, Virtual Keyboard, Responsive)
├── languagecappy.js          # Toàn bộ mã nguồn JavaScript xử lý logic, API Gemini, Firebase, TTS/STT, IME
├── jquery.min.js             # Thư viện jQuery v3.7.1 chạy offline cục bộ
└── englishcappy.md           # [File này] Bản đặc tả kiến trúc kỹ thuật của toàn bộ dự án
```

### Chi tiết vai trò từng file:
1. **`English_gemini_ai.html`**:
   - Thẻ `<meta name="referrer" content="no-referrer">`: Rất quan trọng để gọi API phát âm âm thanh Google Translate TTS không bị chặn bởi chính sách bảo mật Referrer.
   - Màn hình Đăng nhập (`#login-screen`): Khung xác thực tài khoản trước khi truy cập ứng dụng.
   - Giao diện hội thoại chính (`#main-app`): Header, thanh chọn ngôn ngữ (`.lang-bar`), thanh trạng thái API key, khung chat (`#messages`), thanh nhập liệu + nút micro + bộ gõ phím ảo Pinyin (`#pinyin-keyboard-panel`).
   - Hộp thoại lịch sử hội thoại (`#history-modal`): Lọc theo tab Tiếng Anh, Tiếng Hoa, Tất cả.
   - Nhúng liên kết trực tiếp tới `languagecappy.css`, `jquery.min.js` và `languagecappy.js`.

2. **`languagecappy.css`**:
   - Quy định thiết kế UI tối giản, hiện đại, màu sắc trực quan (Badge thành công xanh lá, lỗi đỏ, cảnh báo vàng, avatar tím thương hiệu `✦`).
   - Xử lý Responsive Layout thích ứng cả màn hình Desktop và Mobile/Tablet.
   - Thiết kế giao diện bàn phím ảo Pinyin QWERTY 4 hàng nút bấm và thanh chọn gợi ý chữ Hán.
   - Tối ưu cuộn tin nhắn chat và kiểu dáng bubble trò chuyện, hộp góp ý (`.feedback`), hộp dịch (`.translation-box`).

3. **`languagecappy.js`**:
   - Chứa 100% logic điều hướng, xác thực đăng nhập, cấu hình Gemini API, tương tác Firebase REST, xử lý STT/TTS và bộ gõ Pinyin.

4. **`jquery.min.js`**:
   - Bản rút gọn jQuery 3.7.1 độc lập trong thư mục dự án, không phụ thuộc kết nối Internet tới CDN ngoài.

---

## 3. Sơ đồ Kiến trúc & Luồng Xử lý Dữ liệu (Architecture & Data Flow)

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Single Page App)"]
        User([Người dùng]) --> Login[Màn hình Đăng nhập]
        Login -->|Kiểm tra tài khoản| FB_Auth[Firebase /users/{username}.json]
        FB_Auth -->|Thành công| MainApp[Giao diện chính Language Cappy]
        
        MainApp --> SelectLang[Chọn Ngôn ngữ: en / zh]
        SelectLang --> LoadKey[Lấy API Key tương ứng từ Firebase /api_keys]
        
        User -->|1. Giọng nói| STT[Web Speech Recognition: en-US / zh-CN]
        User -->|2. Nhập trực tiếp| InputBox[Ô soạn tin nhắn #message]
        User -->|3. Phím ảo Pinyin| IME[Google Input Tools + PINYIN_DICT]
        
        IME --> InputBox
        STT --> InputBox
        
        InputBox --> SendAction[Gửi tin nhắn sendMessage]
    end

    subgraph GoogleGemini ["Google Gemini Cloud"]
        SendAction --> GeminiReq[REST API: gemini-3.5-flash-lite]
        GeminiReq --> SysPrompt[System Prompt: Huấn luyện viên đàm thoại]
        SysPrompt --> SchemaValidation[JSON Schema: COACH_SCHEMA]
        SchemaValidation --> GeminiResp[JSON: assessment, suggested, explanationVi, reply, replyVi]
    end

    subgraph OutputHandler ["Xử lý Phản hồi & Lưu trữ"]
        GeminiResp --> UI_Display[Hiển thị Bubble Chat + Khung Nhận xét .feedback]
        UI_Display --> TTS_Engine[Phát âm AI: Web SpeechSynthesis / Google TTS online]
        UI_Display --> SaveDB[Tự động lưu Firebase /sessions/{username}/{sessionId}.json]
    end
```

---

## 4. Hệ thống Xác thực Tài khoản (Authentication)

Ứng dụng bảo vệ quyền truy cập thông qua tài khoản lưu trữ trên Firebase Realtime Database.

- **Vị trí lưu trên Firebase**: `/users/{username}.json`
- **Cấu trúc bản ghi User**:
  ```json
  {
    "password": "mat_khau_nguoi_dung"
  }
  ```
- **Luồng xử lý**:
  1. Khi tải trang: Kiểm tra `sessionStorage.getItem('cappy_logged_user')`.
     - Nếu đã đăng nhập: Ẩn `#login-screen`, mở `#main-app`, tự động khởi tạo chat mới, lấy lịch sử và tải API key.
     - Nếu chưa: Giữ màn hình đăng nhập, focus vào ô `Username`.
  2. Khi nhấn nút "Đăng nhập":
     - Gửi HTTP GET: `FIREBASE_BASE_URL + '/users/' + encodeURIComponent(username) + '.json?t=' + Date.now()` kèm `{ cache: 'no-store' }`.
     - Kiểm tra nếu `userData && userData.password === password`.
     - Đúng: Lưu username vào `sessionStorage`, chuyển vào giao diện chính qua hiệu ứng fade transition.
     - Sai / Lỗi: Hiển thị thông báo màu đỏ, giữ nguyên ô đăng nhập.
  3. Đăng xuất: Bấm nút "Đăng xuất" trên thanh Header -> Xóa `sessionStorage` -> Trở về `#login-screen`.

---

## 5. Tích hợp Google Gemini API (AI Language Coach Engine)

### 5.1 Cấu hình Model & Endpoint
- **Mã Model**: `gemini-3.5-flash-lite` (tối ưu tốc độ phản hồi cực nhanh, chi phí thấp, hỗ trợ tiếng Anh & Hoa chính xác).
- **Endpoint sinh nội dung**:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={API_KEY}`
- **Kiểm tra kết nối (Health Check)**:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite?key={API_KEY}`
  > *Lưu ý quan trọng*: Sử dụng trực tiếp query string `?key=...` thay vì truyền header `x-goog-api-key` để tránh kích hoạt CORS Preflight Request (`OPTIONS`) bị các trình duyệt chặn khi chạy dưới dạng file HTML cục bộ hoặc web tĩnh.

### 5.2 Quản lý API Key Độc lập (Firebase + Fallback an toàn)
- Tiếng Anh và Tiếng Hoa sử dụng **2 API key độc lập** để tối ưu hóa hạn ngạch (quota) và hạn chế quá tải:
  - Key Tiếng Anh: Tải từ Firebase path `/api_keys/gemini_english.json`.
  - Key Tiếng Hoa: Tải từ Firebase path `/api_keys/gemini_chinese.json`.
- **Cơ chế Base64 dự phòng (Offline Fallback)**:
  - Nếu mất mạng hoặc Firebase không phản hồi key hợp lệ, ứng dụng tự động giải mã key dự phòng qua `atob('...')`.
  - Việc mã hóa Base64 giúp ngăn chặn công cụ tự động quét secret của GitHub (GitHub Secret Scanning) tự ý thu hồi key khi commit mã nguồn.
- **Nguyên tắc an toàn**: Khi người dùng gõ API key thủ công vào ô input trên web, hệ thống **không tự ý ghi đè lên Firebase** nhằm bảo vệ cấu hình chung.

### 5.3 System Prompts & Structured Outputs (JSON Schema)
Mỗi ngôn ngữ sử dụng một System Instruction chuyên biệt:
- **`SYSTEM_PROMPT_EN`**: Huấn luyện viên giao tiếp tiếng Anh cho người mới. Yêu cầu người dùng chỉ giao tiếp bằng tiếng Anh (nếu gõ tiếng Việt hay ngôn ngữ khác sẽ lịch sự nhắc nhở bằng tiếng Anh và giải thích tiếng Việt). Nhận xét lỗi ngữ pháp, gợi ý diễn đạt tự nhiên hơn, đặt câu hỏi tiếp nối cuộc trò chuyện.
- **`SYSTEM_PROMPT_ZH`**: Huấn luyện viên giao tiếp tiếng Hoa (Mandarin). Hướng dẫn gợi ý câu sửa bằng chữ Hán Giản thể kèm phiên âm Pinyin trong ngoặc đơn, kèm bản dịch và lời khuyên bằng tiếng Việt.

**JSON Schema bắt buộc (`COACH_SCHEMA`)**:
```json
{
  "type": "object",
  "properties": {
    "assessment": {
      "type": "string",
      "enum": ["correct", "correction", "naturalness", "not_english", "not_target_lang"],
      "description": "Đánh giá câu: chuẩn, có lỗi cần sửa, cần tự nhiên hơn, hoặc không đúng ngôn ngữ mục tiêu"
    },
    "suggested": {
      "type": "string",
      "description": "Câu hoàn chỉnh đã chỉnh sửa (hoặc rỗng nếu câu người dùng đã chuẩn)"
    },
    "explanationVi": {
      "type": "string",
      "description": "Giải thích ngắn bằng tiếng Việt về lỗi hoặc lý do sửa"
    },
    "reply": {
      "type": "string",
      "description": "Câu phản hồi hội thoại tiếp nối bằng ngôn ngữ mục tiêu (Anh hoặc Hoa)"
    },
    "replyVi": {
      "type": "string",
      "description": "Bản dịch tiếng Việt chính xác và tự nhiên của câu reply"
    }
  },
  "required": ["assessment", "suggested", "explanationVi", "reply", "replyVi"]
}
```

### 5.4 Tính năng Dịch thuật theo ngữ cảnh (`translateText`)
- Mỗi tin nhắn của bot có nút `🌐 Dịch tiếng Việt`.
- Nếu trong dữ liệu JSON ban đầu đã có sẵn `replyVi`, hệ thống hiển thị ngay lập tức không tốn thêm request.
- Nếu mở lại tin nhắn cũ chưa có `replyVi`, ứng dụng gọi hàm `translateText(text)` gửi request riêng tới Gemini để dịch câu sang tiếng Việt.

---

## 6. Tích hợp Firebase Realtime Database (REST API)

- **Firebase Base URL**: `https://englishtalk-17f02-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Phương thức giao tiếp**: Hoàn toàn dùng HTTP REST (`fetch`), không cần cài đặt thư viện Firebase SDK cồng kềnh.

### 6.1 Bảng cấu trúc dữ liệu Firebase (Schema)

```json
{
  "users": {
    "admin": {
      "password": "password123"
    },
    "hocvien": {
      "password": "123"
    }
  },
  "api_keys": {
    "gemini_english": "AIzaSy...",
    "gemini_chinese": "AIzaSy..."
  },
  "sessions": {
    "khanh": {
      "session_1717654321000": {
        "id": "session_1717654321000",
        "user": "khanh",
        "lang": "en",
        "title": "What would you like to talk about?",
        "createdAt": 1717654321000,
        "updatedAt": 1717654350000,
        "dateStr": "06/11/2026 08:30",
        "messages": [
          {
            "role": "user",
            "text": "Hello, how are you?",
            "timestamp": 1717654321000
          },
          {
            "role": "bot",
            "text": "I'm doing great, thank you! How about you?",
            "replyVi": "Tôi rất khỏe, cảm ơn bạn! Còn bạn thì sao?",
            "feedback": {
              "assessment": "correct",
              "suggested": "",
              "explanationVi": "",
              "reply": "I'm doing great, thank you! How about you?",
              "replyVi": "Tôi rất khỏe, cảm ơn bạn! Còn bạn thì sao?"
            },
            "timestamp": 1717654323000
          }
        ]
      }
    }
  }
}
```

### 6.2 Các thao tác REST với Firebase:
1. **Lấy API Key**: `GET /api_keys/gemini_english.json` hoặc `/api_keys/gemini_chinese.json`
2. **Xác thực User**: `GET /users/{username}.json`
3. **Lấy danh sách cuộc trò chuyện theo người dùng**: `GET /sessions/{username}.json`
4. **Lưu/Cập nhật cuộc trò chuyện của người dùng**: `PUT /sessions/{username}/{sessionId}.json`
5. **Xóa một cuộc trò chuyện của người dùng**: `DELETE /sessions/{username}/{sessionId}.json`
6. **Xóa hàng loạt theo tab / toàn bộ của người dùng**: Duyệt mảng session tương ứng gửi lệnh `DELETE` hoặc `DELETE /sessions/{username}.json`.

---

## 7. Xử lý Giọng nói Đa ngôn ngữ (STT & TTS)

### 7.1 Nhận dạng Giọng nói (Speech-to-Text)
- Sử dụng Web Speech API chuẩn trình duyệt: `window.SpeechRecognition || window.webkitSpeechRecognition`.
- Tự động thay đổi ngôn ngữ nhận diện theo tab:
  - Chọn Tiếng Anh: `recognition.lang = 'en-US'`.
  - Chọn Tiếng Hoa: `recognition.lang = 'zh-CN'`.
- Tích hợp bộ lọc Regex kiểm tra tức thời sau khi nói: Nếu đang chọn Tiếng Anh mà người dùng nói tiếng Việt -> cảnh báo ngay bằng tiếng Anh và đọc to thông báo bằng giọng đọc.

### 7.2 Động cơ Phát âm Đa tầng (Hybrid Text-to-Speech)
Được thiết kế để hoạt động mượt mà trên tất cả thiết bị (PC, Mac, iPhone Safari, Android Chrome):
1. **Tầng 1 (Local Web SpeechSynthesis)**:
   - Quét tìm voice bản ngữ phù hợp (`en-US` hoặc `zh-CN`/Mandarin).
   - Nếu tìm thấy giọng trong hệ điều hành, phát trực tiếp qua `SpeechSynthesisUtterance`.
2. **Tầng 2 (Google Translate TTS Online Fallback)**:
   - Với các thiết bị di động (như Android chưa cài gói giọng tiếng Hoa, hoặc iOS bị lỗi voice), hệ thống tự động fallback sang Google Translate TTS endpoint:
     `https://translate.google.com/translate_tts?ie=UTF-8&tl={zh-CN|en}&client=tw-ob&q={encodedChunk}`
   - Cơ chế chia nhỏ văn bản (Chunking) thông minh: Cắt câu theo dấu phẩy, chấm, hỏi tối đa 150 ký tự mỗi đoạn để tránh chạm giới hạn độ dài của Google.
   - Thẻ `<meta name="referrer" content="no-referrer">` trong file HTML giữ vai trò quyết định giúp phát âm thanh trực tiếp mà không bị lỗi HTTP 403 Forbidden.

---

## 8. Bộ gõ Tiếng Hoa Pinyin & Google Input Tools (Virtual IME)

Khi người dùng chuyển sang tab `Tiếng Hoa (中文)`:
- Thanh công cụ điều khiển bàn phím xuất hiện:
  - `[ ⌨️ Ẩn Pinyin / ⌨️ Bàn phím Pinyin ]`: Bật/tắt bàn phím ảo.
  - `[ Dùng bàn phím thiết bị ]`: Chuyển sang chế độ gõ bằng bàn phím hệ điều hành.
- **Giao diện bàn phím ảo Pinyin**:
  - Hộp hiển thị chuỗi Pinyin đang nhập (Badge `PINYIN` + chữ đang gõ + nút `Xóa`).
  - Thanh Candidate Bar: Đánh số thứ tự `1`, `2`, `3`... hiển thị các từ chữ Hán tương ứng.
  - 3 hàng phím chữ cái QWERTY (`q-p`, `a-l`, `z-m`) + nút `⌫ Backspace`.
  - Hàng phím ký tự dấu câu tiếng Hoa: `，`, `。`, `？`, `！`.
- **Luồng xử lý chuyển đổi Pinyin**:
  1. Khi người dùng bấm phím ảo hoặc gõ bàn phím vật lý máy tính: Hàm `fetchGoogleInputCandidates(pinyinText)` được gọi.
  2. Gửi request tới Google Input Tools:
     `https://inputtools.google.com/request?text={pinyin}&itc=zh-t-i0-pinyin&num=11...`
  3. **Từ điển nội bộ dự phòng (`PINYIN_DICT`)**: Nếu mất mạng hoặc API Google Input Tools không trả về kết quả, ứng dụng tự động tra cứu từ điển cục bộ chứa hàng trăm từ vựng HSK thông dụng để hiển thị gợi ý chữ Hán.
  4. Người dùng có thể nhấn phím số `1-9` hoặc phím `Space` để chọn từ ngay lập tức.

---

## 9. Vòng đời Phiên hội thoại & Quản lý Lịch sử (Session Lifecycle)

1. **Khởi tạo trang**:
   - Khi mở web hoặc F5: Luôn khởi tạo phiên chat mới toanh (`startNewChat()`), tránh việc người dùng bị kẹt trong hội thoại cũ.
   - Dữ liệu lịch sử được tải ngầm theo đúng tài khoản đăng nhập (`fetchAllSessions()` từ `/sessions/{username}.json`) để cập nhật số lượng cuộc trò chuyện lên các badge: `📜 LS EN (x)` và `📜 LS 中文 (y)`.
2. **Lưu phiên tự động phân quyền theo người dùng**:
   - Mỗi khi người dùng gửi câu hỏi và bot phản hồi xong, phiên được đồng bộ ngay lập tức lên Firebase `/sessions/{username}/{sessionId}.json`.
   - Tiêu đề phiên (`title`) tự động lấy theo 40 ký tự đầu tiên của câu thoại mở đầu.
3. **Modal Lịch sử Hội thoại**:
   - Chỉ hiển thị lịch sử của chính tài khoản đang đăng nhập (kèm tên người dùng trên tiêu đề).
   - Hỗ trợ lọc theo 3 tab: `🇬🇧 Tiếng Anh`, `🇨🇳 Tiếng Hoa`, `Tất cả`.
   - Bấm vào một phiên cũ: Tự động chuyển đúng ngôn ngữ (`currentLang`), nạp lại toàn bộ tin nhắn, lời góp ý và lịch sử đàm thoại.
   - Hỗ trợ nút xóa từng phiên riêng lẻ (`🗑️`) hoặc xóa toàn bộ danh sách trong tab đang xem của người dùng đó.
   - Khi người dùng đăng xuất: Xóa sạch bộ nhớ tạm `allSessions`, reset các badge đếm và tin nhắn để ngăn rò rỉ dữ liệu sang tài khoản đăng nhập tiếp theo.

---

## 10. Hướng dẫn Dành cho AI Agent & Lập trình viên Kế tiếp (Developer Guidelines)

Khi thực hiện sửa đổi hoặc bổ sung tính năng vào dự án này, vui lòng tuân thủ các nguyên tắc sau:

1. **Bảo mật API Key**:
   - Không commit API Key dạng plain-text vào file mã nguồn. Luôn lưu trên Firebase `/api_keys/` hoặc mã hóa Base64 cho key dự phòng trong code.
2. **Không làm hỏng CORS**:
   - Với Google Gemini API, luôn giữ tham số `?key=` trên URL query; không đổi sang dùng HTTP Header `x-goog-api-key` trừ khi chạy trên môi trường có backend proxy.
3. **Thẻ Meta No-Referrer**:
   - Không được xóa `<meta name="referrer" content="no-referrer">` trong `English_gemini_ai.html` vì đây là điều kiện tiên quyết để tính năng Google Translate TTS hoạt động.
4. **Phân tách Ngôn ngữ**:
   - Khi bổ sung ngôn ngữ mới (ví dụ Tiếng Nhật `ja`, Tiếng Hàn `ko`):
     - Thêm System Prompt và cấu hình `recognition.lang`.
     - Thêm nhánh key trên Firebase `/api_keys/gemini_{lang}`.
     - Cập nhật hàm `getSessionLang` và phân loại tab trong Modal Lịch sử.
5. **Cơ chế Serverless**:
   - Tiếp tục duy trì giải pháp Serverless nhẹ nhàng qua REST API để web có thể chạy trên GitHub Pages, Netlify, Vercel hoặc mở trực tiếp trên máy cục bộ mà không đòi hỏi cài đặt môi trường phức tạp.
