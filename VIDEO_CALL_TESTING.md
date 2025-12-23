# Video Calling Feature - Testing Guide

## Setup Instructions

### 1. Database Migration
The Call and CallParticipant tables have been created. To verify:
```bash
npx prisma studio
```
Look for the `Call` and `CallParticipant` tables in the database.

### 2. Start the Server
```bash
npm run dev
```
The server will start on `http://localhost:3000` with Socket.io enabled.

### 3. Test Environment
For proper testing, you'll need:
- **2+ browser windows** (can use regular + incognito mode)
- **HTTPS connection** for screen sharing (use ngrok or similar in production)
- **Camera and microphone permissions** enabled

---

## Testing Scenarios

### Test 1: One-on-One Video Call

**Steps:**
1. Open two browser windows
2. Login as different users in each window
3. Create or join a chat between the two users
4. In Window 1, click the **Video icon** (camera) in the chat header
5. Accept camera/microphone permissions
6. In Window 2, the call should auto-join (current implementation)
7. Verify:
   - ✅ Both users see each other's video
   - ✅ Audio works in both directions
   - ✅ Video quality indicator shows "Excellent" or "Good"

**Controls to Test:**
- Click **camera icon** to toggle video on/off
- Click **microphone icon** to toggle audio on/off
- Verify other participant sees video/audio state changes

---

### Test 2: Group Video Call

**Steps:**
1. Open 3-4 browser windows
2. Login as different users
3. Create a group with all users
4. Start a video call from one window
5. Other windows should show/join the call
6. Verify:
   - ✅ Grid layout shows all participants (1-6 max)
   - ✅ Each participant's video is visible
   - ✅ Audio from all participants is audible

---

### Test 3: Screen Sharing

**Steps:**
1. Start a video call (one-on-one or group)
2. Click the **Monitor icon** to share screen
3. Select window or entire screen to share
4. Verify:
   - ✅ Your local video switches to screen preview
   - ✅ Other participants see your screen
   - ✅ Click **Monitor icon** again to stop sharing
   - ✅ Video switches back to camera

**Note:** Screen sharing requires HTTPS in production. In development (localhost), it should work.

---

### Test 4: Call Recording

**Steps:**
1. Start a video call
2. Click the **Circle icon** (record button) to start recording
3. Wait 10-15 seconds
4. Click the **Circle icon** again to stop recording
5. Recording will automatically download as `call-recording-[callId].webm`
6. Verify:
   - ✅ Recording indicator (red dot) shows during recording
   - ✅ Recording timer displays elapsed time
   - ✅ Downloaded file plays correctly with video/audio

**Open Recording:**
- Double-click the .webm file
- Should open in browser or media player
- Video and audio should be synchronized

---

### Test 5: Picture-in-Picture (PiP)

**Steps:**
1. Start a video call
2. Click the **PiP icon** (picture-in-picture)
3. A floating video window should appear
4. Switch to another tab or window
5. Verify:
   - ✅ Floating video continues to show remote participant
   - ✅ Audio continues to play
   - ✅ Click floating window to return to call
   - ✅ Click PiP icon again to exit PiP mode

**Note:** PiP may not work on all browsers (Chrome/Edge best support).

---

### Test 6: Call Quality & Reconnection

**Steps:**
1. Start a video call
2. Observe the quality indicator badge (top-left of video)
3. Simulate network issues:
   - **Option A:** Turn off WiFi briefly, then reconnect
   - **Option B:** Use Chrome DevTools → Network → Set to "Offline" for 5 seconds
4. Verify:
   - ✅ Quality changes from "Excellent" to "Poor"
   - ✅ "Reconnecting..." message appears
   - ✅ After 2 seconds, ICE restart attempts
   - ✅ Once connection restored, quality returns to "Excellent"

**Quality States:**
- 🟢 **Excellent**: Stable connection, no issues
- 🟡 **Good**: Normal operation, checking connection
- 🟠 **Fair**: Connection establishing
- 🔴 **Poor**: Connection lost or failing

---

### Test 7: Call History

**Steps:**
1. Make 2-3 video calls (complete them)
2. End each call using the **Phone Off icon**
3. Navigate to chat page (main chat list)
4. Look for call history section (or implement a "Call History" button)
5. Verify:
   - ✅ All calls are listed with timestamps
   - ✅ Call duration is shown
   - ✅ Call status (Completed, Missed, etc.) is correct
   - ✅ Participant names are displayed
   - ✅ If recording was made, download icon is present

**Download Recording:**
- Click the download icon next to a recorded call
- Recording should download and play

---

### Test 8: Toggle Video/Audio States

**Steps:**
1. Start a call between User A and User B
2. **User A:** Click camera icon to turn off video
3. **User B:** Verify User A's video is hidden/paused
4. **User A:** Click camera icon again to turn on video
5. **User B:** Verify User A's video is visible again
6. **User A:** Click microphone icon to mute
7. **User B:** Talk and verify User A cannot hear
8. **User A:** Unmute microphone
9. Verify:
   - ✅ Video toggle works for both participants
   - ✅ Audio toggle works for both participants
   - ✅ Icons update correctly (slash through icon when off)

---

### Test 9: Multiple Participants Join/Leave

**Steps:**
1. Start a group call with User A, B, C
2. User D joins the call
3. Verify:
   - ✅ Grid layout adjusts to show 4 participants
   - ✅ User D's video appears in the grid
4. User B leaves the call
5. Verify:
   - ✅ Grid layout adjusts to show 3 participants
   - ✅ User B's video is removed from grid

---

### Test 10: End Call

**Steps:**
1. Start a call
2. Click the **Phone Off icon** (red hang up button)
3. Verify:
   - ✅ Call ends immediately
   - ✅ Modal closes
   - ✅ Camera/microphone access is released
   - ✅ Call record is saved in database with "ended" status

---

## Database Verification

### Check Call Records:
```bash
npx prisma studio
```

Navigate to **Call** table:
- Verify call records exist
- Check `status`: "initiated", "ringing", "active", "ended", "missed", "rejected"
- Check `duration`: Should be in seconds
- Check `quality`: "excellent", "good", "fair", "poor"
- Check `recordingUrl`: Should be present if recording was made
- Check `startedAt` and `endedAt`: Timestamps should be correct

Navigate to **CallParticipant** table:
- Verify participants are linked to calls
- Check `status`: "invited", "joined", "left", "rejected"
- Check `joinedAt` and `leftAt`: Timestamps should be present

---

## Common Issues & Troubleshooting

### Issue: "Cannot access camera/microphone"
**Solution:**
- Check browser permissions (click lock icon in address bar)
- Ensure no other app is using camera/microphone
- Restart browser

### Issue: "Video not showing for other participant"
**Solution:**
- Check WebRTC connection in browser console
- Verify STUN servers are accessible
- Check firewall settings
- Ensure both users have video enabled

### Issue: "Screen sharing not working"
**Solution:**
- Screen sharing requires HTTPS (except localhost)
- Use ngrok or similar for testing: `ngrok http 3000`
- Check browser permissions for screen capture

### Issue: "Recording not downloading"
**Solution:**
- Check browser download settings
- Verify recording chunks are being captured (console.log)
- Ensure call lasted at least a few seconds

### Issue: "Picture-in-Picture not working"
**Solution:**
- PiP is not supported on all browsers
- Use Chrome or Edge for best compatibility
- Ensure video element is playing before enabling PiP

### Issue: "Call quality shows 'Poor' immediately"
**Solution:**
- Check network connection
- Verify STUN servers are reachable
- Look for WebRTC errors in console
- Try restarting the call

---

## Socket.io Events to Monitor

Open browser console and watch for these events:

### Emitted Events:
- `call:join` - When user joins call room
- `call:offer` - WebRTC offer sent to peer
- `call:answer` - WebRTC answer sent to peer
- `call:ice-candidate` - ICE candidates exchanged
- `call:toggle-video` - Video state changed
- `call:toggle-audio` - Audio state changed
- `call:leave` - User leaves call

### Received Events:
- `call:user-joined` - New participant joined
- `call:offer` - Received offer from peer
- `call:answer` - Received answer from peer
- `call:ice-candidate` - Received ICE candidate
- `call:user-left` - Participant left call
- `call:user-video-toggled` - Peer toggled video
- `call:user-audio-toggled` - Peer toggled audio

---

## API Testing

### Get Call History:
```bash
curl -X GET "http://localhost:3000/api/calls?userId=USER_ID" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Create Call:
```bash
curl -X POST "http://localhost:3000/api/calls" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "video",
    "groupId": "GROUP_ID",
    "participantIds": ["USER_ID_1", "USER_ID_2"]
  }'
```

### Update Call:
```bash
curl -X PUT "http://localhost:3000/api/calls" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "callId": "CALL_ID",
    "status": "ended",
    "duration": 120,
    "quality": "excellent"
  }'
```

---

## Performance Testing

### Test with Multiple Participants:
1. Open 6 browser windows (maximum supported)
2. Start a group call
3. Monitor:
   - CPU usage
   - Network bandwidth
   - Video frame rate
   - Audio quality

### Expected Performance:
- **CPU**: 30-50% per participant
- **Bandwidth**: 1-2 Mbps per participant for video
- **Frame Rate**: 24-30 fps
- **Latency**: <100ms for audio, <200ms for video

---

## Production Considerations

### Before Deploying:

1. **HTTPS Required:**
   - Camera/microphone access requires HTTPS
   - Screen sharing requires HTTPS
   - Use SSL certificate in production

2. **TURN Server:**
   - STUN servers only work for some NAT types
   - Add TURN server for users behind strict firewalls
   - Example: Use Twilio TURN or coturn

3. **Recording Storage:**
   - Current implementation downloads recordings locally
   - For production, upload to S3/cloud storage
   - Add recording URL to database

4. **Scalability:**
   - Current peer-to-peer model limits to 6 participants
   - For larger calls, consider SFU (Selective Forwarding Unit)
   - Services: Janus, Mediasoup, or commercial (Agora, Twilio)

5. **Monitoring:**
   - Add analytics for call quality
   - Track connection failures
   - Monitor bandwidth usage
   - Log WebRTC errors

---

## Next Steps

### Features to Complete:

1. **Virtual Backgrounds** ⏳
   - Use Canvas API for background replacement
   - Add blur effect
   - Support custom background images

2. **Call Notifications** ⏳
   - Show incoming call UI
   - Add ringtone sound
   - Accept/Decline buttons

3. **Call Waiting** ⏳
   - Handle multiple simultaneous calls
   - Show notification during active call
   - Allow call switching

4. **End-to-End Encryption** ⏳
   - Implement insertable streams API
   - Add key exchange mechanism

---

## Support

For issues:
1. Check browser console for errors
2. Verify Socket.io connection
3. Check WebRTC connection state
4. Review STUN/TURN server logs
5. Test network connectivity

---

**Last Updated:** January 2025  
**Status:** Core features implemented and ready for testing  
**Compatibility:** Chrome 80+, Firefox 75+, Edge 80+, Safari 14+
