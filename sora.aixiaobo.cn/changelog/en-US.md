## v1.0.9 <span class="badge-latest">Latest</span>

**Release Date: 2025-11-13**

### 🛠 Improvements
- Optimized recharge page amount display: Unified quota display format between recharge page and profile page, supporting multiple currency types (USD/CNY/Custom Currency)

---

## v1.0.8

**Release Date: 2025-11-11**

### ✨ New Features
- Added usage restriction reminders: Due to Pro account limitations, usage restrictions may apply at times, with new restriction notifications

---

## v1.0.7

**Release Date: 2025-11-10**

### ✨ New Features
- Task history page supports on-demand loading: Initially loads 5000 records, click button to load more historical data
- New "Load More" button: Loads 5000 historical records each time
- New "Load All" button: Load all historical data with one click

### 🎨 UI Improvements
- Filter card spacing optimization: Reduced top and bottom padding to free up more space for task list

---

## v1.0.6

**Release Date: 2025-11-08**

### 🐛 Bug Fixes
- Fixed token editing error: You can now edit token name, quota and expiration time normally
- Fixed unlimited quota token display issue: Support viewing and editing unlimited quota tokens created by admin

---

## v1.0.5

**Release Date: 2025-11-07**

### 🐛 Bug Fixes
- Fixed checkbox display sync issue on task history page: Resolved bug where checkmarks and count were inconsistent

### 🛠 Improvements
- Optimized error message title: Changed "API Error" to "Operation Tips" for better user understanding
- Optimized registration page: Added friendly reminder for invalid email format
- Optimized task history page: Top banner now uses dynamic configuration, supporting unified backend management

---

## v1.0.4

**Release Date: 2025-11-04**

### 🛠 Improvements
- Hid the token named "Batch Tools" to prevent accidental deletion

---

## v1.0.3

**Release Date: 2025-11-03**

### ✨ New Features

#### Token Management System
- Added token management in profile page: view, create, and delete API tokens
- Support setting token quota, expiration time and other options
- Currency switching: support USD/CNY dual currency display, auto-select based on language
- Quick amount buttons: provide common amount quick selection (1/10/50/100/500/1000)
- Real-time amount conversion: display equivalent amount when inputting quota
- Token key management: support show/hide key, one-click copy
- Token status display: enabled, disabled, expired, exhausted status indicators
- Used quota statistics: display used quota for each token

#### Balance Display Optimization
- Balance display fully integrated with backend config: support USD, CNY, TOKENS, CUSTOM display modes
- Currency selection based on backend settings: prioritize backend config, fallback to CNY for Chinese and USD for English when not configured
- Support custom currency: admin can set custom currency symbol and exchange rate in backend

#### History Feature Enhancement
- Added drag-to-select feature in history page: hold and drag to batch select tasks
- Added invert selection button in history page: one-click to invert all selections on current page
- Added 20 items per page option in history page

### 🎨 UI Improvements

#### Profile Page Layout Optimization
- User info and invite code in parallel layout, fully utilizing screen space
- Action buttons integrated into user info card, more compact layout

#### Token Creation Experience Optimization
- Create token modal uses sidebar design, smoother operation
- Currency switch button: one-click switch between USD/CNY
- Quick amount buttons: one-click fill common amounts
- Real-time amount hint: display equivalent amount when inputting

#### Other UI Improvements
- Silent error handling on login/register pages, only showing prompts after user actions

### 🐛 Bug Fixes

- Fixed incorrect browser tab title display on all pages

---

## v1.0.2

**Release Date: 2025-11-02**

### ✨ New Features

#### Tutorial System
- Added "📚 Tutorial" button in top navigation bar
- Tutorial items open external links in new window

#### Changelog System
- Added "Changelog" page to record version updates
- Version number in bottom-left corner is clickable to jump to changelog page
- Support multi-language changelog files (zh-CN, zh-TW, en-US)

### 🎨 UI Improvements

#### Unified Border Radius
- Unified all page card border radius to 16px
- Optimized Tutorial and Changelog page container border radius
- Optimized card border radius for all main feature pages (generate, watermark removal, batch operations, etc.)
- More modern and unified visual style

#### Unified Button Height
- Tutorial button and theme toggle button height unified to 36px
- Consistent with language switcher circular button height
- More coordinated top navigation bar button layout

#### Layout Adjustments
- Adjusted top button order: Tutorial → Language Switcher → Theme Toggle → User Avatar
- Optimized tutorial list item text: "External Link" changed to "Click to View"

#### Profile Page Optimization
- Invite link changed to invite code display: only shows invite code parameter, not full URL
- Copy function optimized: clicking copy only copies the invite code for simplicity

#### Recharge Page Enhancement
- Added "Purchase Code" quick button: direct access to purchase page from recharge page
- One-click purchase: opens purchase link in new window with a single click
- Removed logo from recharge page header: cleaner interface

#### Login Experience Optimization
- Improved login messages: no longer shows negative prompts like "insufficient balance" during login

---

## v1.0.1

**Release Date: 2025-11-01**

### ✨ New Features

#### Pagination Enhancement
- Support 100/200/500/1000 items per page
- Default display 100 items per page
- Selection automatically saved locally, auto-restored on next visit
- Automatically jump to first page when changing page size

#### Pagination Bar Layout Optimization
- Mobile responsive: automatically hide pagination bar when screen width ≤ 768px
- Pagination bar aligned with content cards above, with rounded top corners
- Three-column layout: left select-all checkbox, center pagination controls, right page size selector
- Responsive design: horizontal scrolling supported when many page numbers

#### User Experience Improvements
- Pagination bar fixed at page bottom, always visible when scrolling
- Select-all checkbox moved to pagination bar for easier operation
- Pagination settings persisted in storage for better experience

### 🎨 UI Improvements

- Optimized pagination button and page number sizes for more compact and beautiful appearance
- Unified rounded corners and shadow styles for consistent visual style
- Optimized font sizes and spacing for better readability

### 🐛 Bug Fixes

- Fixed pagination bar element overlap issue on narrow screens
- Fixed pagination selector being blocked by left sidebar
- Optimized pagination bar display on different screen sizes

---

## v1.0.0 Beta

**Release Date: 2025-10-07**

### 🎉 Initial Release

- Video generation: support text-to-video and image-to-video
- History management: view, filter, and download generated videos
- Batch operations: batch generation and batch download
- Multi-language support: Simplified Chinese, Traditional Chinese, English
- Dark mode: support light and dark theme switching
