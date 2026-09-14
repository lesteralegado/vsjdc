# UI verification — September 11, 2026

User flow: clinic landing → appointment hub → booking preview or tracking form; staff login → separately labeled dashboard preview.

## Passed

- `npm.cmd run build`: TypeScript and Vite production build completed.
- `npm.cmd run lint`: completed without findings.
- Browser renders meaningful content with no Vite error overlay; final browser error log was empty.
- Original logos and Poppins loaded. Logo source/destination hashes match.
- Main Appointments navigation opens the hub with both booking and tracking choices.
- Cabuyao/Santa Rosa switching updates branch details and booking summary.
- Booking preview traversed all five steps with a service, future date, preferred time, and fictional test patient values. Review preserved selections; confirmation explicitly said no booking was submitted.
- Mobile-number HTML pattern issue found during browser verification was fixed and rechecked.
- Tracking loading, not-found, result, and error states passed temporary browser-only adapter tests. Result included status, branch, unassigned dentist fallback, service, date, and Philippine time. Test adapter was restored immediately afterward; production source has no test appointment records.
- Staff sign-in rejected unavailable authentication and cleared the password. Dashboard preview loads separately without exposing real records.
- Dashboard branch selector and section navigation work.
- Public mobile menu opens and exposes the Appointments action.
- Branch addresses and map actions share branch-specific Google Maps destinations with `_blank`. Email, Facebook, Instagram, and all three phone links use the supplied details.

## Responsive checks

| Screen | Width checked | Horizontal overflow |
| --- | --- | --- |
| Landing | 320px, 1264px | None |
| Booking | 390px, 768px, 1264px | None |
| Tracking | 390px | None |
| Staff login | 390px | None |
| Dashboard | 390px, 1440px | None |

Screenshots are saved in the workspace's `design-reference` directory. Desktop landing, booking, mobile review, and dashboard screenshots were compared with the provided PDF's design language. Overlapping/clipped reference text was corrected rather than reproduced.

## Limits

- The live Figma design was inaccessible due to its MCP plan limit; comparison used the supplied PDF.
- No Supabase backend, schema, or credentials existed in the workspace, so real authentication, scheduling conflicts, database writes, and tracking lookups cannot be verified. The UI clearly indicates disconnected behavior.
- Exact Google Maps place pins are not independently confirmed. Current links use the provided Cabuyao plus code and the Santa Rosa branch name/address search, not verified place IDs.
- Patient-facing availability and dentist identities remain unpopulated until actual data is connected. Dashboard metrics display unavailable markers rather than invented numbers.
