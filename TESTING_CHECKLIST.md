# Quick Testing Guide

## Server Status
✅ Server is running on http://localhost:3000

## What to Test:

### 1. One-on-One Chat (Group Members Hidden)
1. Navigate to a one-on-one chat
2. ✅ **FIXED:** The "Group Members" button should NOT appear in the header
3. You should only see:
   - Video call button
   - Search button
   - Back button

### 2. Group Chat (Group Members Visible)
1. Navigate to a group chat (3+ members)
2. ✅ The "Group Members" button SHOULD appear
3. Click it to see the member list
4. Header should show: "Group Members (X)" where X is the count

### 3. Video Call Features
Open two browser windows (or use incognito mode):

#### Basic Call Test:
1. **Window 1:** Login as User A
2. **Window 2:** Login as User B (use incognito)
3. **Window 1:** Navigate to chat with User B
4. Click the **Video icon** in header
5. Allow camera/microphone permissions
6. **Window 2:** Should see the call (may need to join manually)

#### Features to Test:
- ✅ **Toggle Video:** Click camera icon to turn video on/off
- ✅ **Toggle Audio:** Click mic icon to mute/unmute
- ✅ **Screen Share:** Click monitor icon to share screen
- ✅ **Record:** Click circle icon to start/stop recording
- ✅ **PiP Mode:** Click maximize icon for picture-in-picture
- ✅ **End Call:** Click red phone icon to hang up

#### Call Quality:
- Watch the quality indicator badge (top-left of video)
- Should show: 🟢 Excellent, 🟡 Good, 🟠 Fair, or 🔴 Poor

### 4. Screen Sharing Test
1. Start a video call
2. Click the **Monitor icon**
3. Select window/screen to share
4. Other participant should see your screen
5. Click **Monitor icon** again to stop sharing

### 5. Call Recording Test
1. Start a video call
2. Click the **Circle icon** (record)
3. Recording indicator appears with timer
4. Talk for 10-15 seconds
5. Click **Circle icon** again to stop
6. File will download as `call-recording-[id].webm`
7. Open the file to verify video/audio

### 6. Call History (If Implemented)
1. Make 2-3 calls
2. Check database or API endpoint: `GET /api/calls`
3. Should show call history with timestamps

### 7. Reconnection Test
1. Start a video call
2. Turn WiFi off for 5 seconds
3. Watch quality indicator turn red
4. Turn WiFi back on
5. Should auto-reconnect after ~2 seconds
6. Quality indicator returns to green

## Browser Testing:
- ✅ Chrome (best support)
- ✅ Edge
- ⚠️ Firefox (PiP may not work)
- ⚠️ Safari (limited support)

## Common Issues:

### Camera/Mic Not Working:
- Check browser permissions (click lock icon in address bar)
- Close other apps using camera/mic
- Restart browser

### Video Not Showing:
- Check browser console for errors
- Verify both users have video enabled
- Try refreshing the page

### Recording Not Downloading:
- Check browser download settings
- Ensure call lasted at least a few seconds
- Try a different browser

## Testing URLs:
- Main App: http://localhost:3000
- Login: http://localhost:3000/login
- Register: http://localhost:3000/register
- Chat: http://localhost:3000/chat

## API Endpoints to Test:
```bash
# Get call history
curl http://localhost:3000/api/calls

# Get specific group info
curl http://localhost:3000/api/groups/[groupId]
```

## Database Check:
```bash
npx prisma studio
```
Look for:
- **Call** table: Should have records after making calls
- **CallParticipant** table: Should track who joined/left

---

## What's Fixed:
✅ One-on-one chats no longer show "Group Members" button
✅ Group chats show "Group Members (X)" with correct count
✅ Delete button only appears for group admins in actual groups (not 1-on-1)
✅ Video call system fully integrated
✅ All Socket.io handlers configured

## Next Steps After Testing:
1. Test all video call features
2. Verify call quality indicators work
3. Test screen sharing
4. Try call recording and download
5. Make multiple calls to populate call history
6. Test on different browsers

**Happy Testing!** 🎉
