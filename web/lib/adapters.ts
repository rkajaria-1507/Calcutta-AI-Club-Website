// @ts-nocheck
/* Adapts the backend's field names (field/build_into/taste) to the ones
   this component was originally written against (industry/buildInto/tasteInto). */
export function adaptMember(m) {
  return {
    ...m,
    industry: m.field,
    buildInto: m.build_into,
    tasteInto: m.taste,
  };
}

export function adaptPitch(p) {
  return {
    id: p.id,
    author: p.author.name,
    authorId: p.author.id,
    title: p.title,
    idea: p.idea,
    ask: p.ask,
    suggested: p.suggested,
    commentCount: p.comment_count,
  };
}
