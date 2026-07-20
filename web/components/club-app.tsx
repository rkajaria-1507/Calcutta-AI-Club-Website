// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { api, getToken, setToken } from "@/lib/api";
import { C, MONO, SANS } from "@/lib/theme";
import { adaptMember, adaptPitch } from "@/lib/adapters";
import { FrontPage } from "@/components/front-page/front-page";
import { PitchBoard } from "@/components/pitches/pitch-board";
import { RoomTonight } from "@/components/room-tonight/room-tonight";
import { Onboarding } from "@/components/onboarding/onboarding";
import { LoginModal } from "@/components/auth/login-modal";
import { ProfileEditor } from "@/components/auth/profile-editor";

export default function ClubApp() {
  const [tab, setTab] = useState("club");
  const [members, setMembers] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [joining, setJoining] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);   // member id or null
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const me = members.find((m) => m.id === currentUser) || null;

  useEffect(() => {
    (async () => {
      try {
        const [memberRows, pitchRows] = await Promise.all([api("/members"), api("/pitches")]);
        setMembers(memberRows.map(adaptMember));
        setPitches(pitchRows.map(adaptPitch));
      } catch {
        // Backend unreachable — the wall just starts empty rather than crashing.
      } finally {
        setLoaded(true);
      }
      const token = getToken();
      if (token) {
        try {
          const me = await api("/me", { auth: true });
          setCurrentUser(me.id);
          setMembers((ms) => (ms.some((m) => m.id === me.id) ? ms : [adaptMember(me), ...ms]));
        } catch {
          // stale/invalid token — stay signed out
        }
      }
    })();
  }, []);

  const addMember = (authResult) => {
    if (!authResult) return;
    setToken(authResult.token);
    const adapted = adaptMember(authResult.member);
    setMembers((ms) => [adapted, ...ms]);
    setCurrentUser(adapted.id);
  };

  const updateLine = async (id, line) => {
    if (id !== currentUser) return;   // owner-only
    const previous = members.find((m) => m.id === id)?.line;
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, line } : m)));
    try {
      await api("/me", { method: "PATCH", auth: true, body: { line } });
    } catch (err) {
      // Revert the optimistic edit rather than pretending it saved.
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, line: previous } : m)));
      console.error("Failed to save line:", err);
    }
  };

  // Returns true on success, false on failure — callers decide how to surface the error.
  const saveProfile = async (updated) => {
    const body = {
      line: updated.line,
      field: updated.industry,
      built: updated.built,
      build_into: updated.buildInto,
      taste: updated.tasteInto,
      dream: updated.dream,
      ask: updated.ask,
      offer: updated.offer,
    };
    try {
      const saved = await api("/me", { method: "PATCH", auth: true, body });
      setMembers((ms) => ms.map((m) => (m.id === updated.id ? adaptMember(saved) : m)));
      return true;
    } catch (err) {
      console.error("Failed to save profile:", err);
      return false;
    }
  };

  const tabs = [
    { id: "club", label: "THE CLUB" },
    { id: "pitch", label: "PITCH BOARD" },
    { id: "room", label: "ROOM TONIGHT" },
  ];

  return (
    <div style={{ background: C.paper, minHeight: "100vh", color: C.ink }}>
      <div style={{ borderBottom: `1px solid ${C.ink}`, background: C.paper, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "stretch", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontFamily: SANS, fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", padding: "16px 0" }}>
            calcutta <span style={{ color: C.indigo, margin: "0 4px" }}>ai</span> club
          </div>
          <div style={{ display: "flex" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  border: "none",
                  borderLeft: `1px solid ${C.line}`,
                  background: tab === t.id ? C.ink : "transparent",
                  color: tab === t.id ? C.paper : C.ink,
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  padding: "0 20px",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
            {me ? (
              <button
                onClick={() => setEditingProfile(true)}
                style={{ border: "none", borderLeft: `1px solid ${C.line}`, background: C.indigo, color: C.paper, fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", padding: "0 18px", cursor: "pointer" }}
                title="Edit your record"
              >
                {me.name.split(" ")[0].toUpperCase()} · EDIT
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                style={{ border: "none", borderLeft: `1px solid ${C.line}`, background: C.ink, color: C.paper, fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", padding: "0 18px", cursor: "pointer" }}
              >
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {tab === "club" && <FrontPage members={members} pitchCount={pitches.length} me={me} onJoin={() => setJoining(true)} onUpdateLine={updateLine} currentUser={currentUser} onEditProfile={() => setEditingProfile(true)} />}
        {tab === "pitch" && <PitchBoard members={members} pitches={pitches} setPitches={setPitches} currentUser={currentUser} me={me} />}
        {tab === "room" && <RoomTonight members={members} />}
      </div>

      {joining && <Onboarding onComplete={addMember} onClose={() => setJoining(false)} />}
      {loginOpen && <LoginModal onNew={() => setJoining(true)} onClose={() => setLoginOpen(false)} />}
      {editingProfile && me && <ProfileEditor member={me} onSave={saveProfile} onClose={() => setEditingProfile(false)} />}
    </div>
  );
}
