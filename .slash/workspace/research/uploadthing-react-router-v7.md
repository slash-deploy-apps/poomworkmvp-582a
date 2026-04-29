# Research: UploadThing Integration with React Router v7 (Framework Mode)

**Date:** 2026-04-29

## Summary

UploadThing provides first-class support for React Router v7 (and Remix v2) with the `@uploadthing/react` package and `uploadthing/remix` adapter. The setup uses resource routes for the upload endpoint, a file router for configuration, and client-side components for the UI. Middleware in the file router handles authentication by validating sessions before uploads proceed, and the `onUploadComplete` callback provides the uploaded file URL for database storage.

---

## 1. UploadThing SDK Setup for Non-Next.js Projects

### Installing Packages

Install both the core UploadThing package and the React adapter:

```bash
npm install uploadthing @uploadthing/react
```

These are the only required packages. The `@uploadthing/react` package provides React components and hooks for the frontend.

**Evidence** ([UploadThing Remix Setup](https://docs.uploadthing.com/getting-started/remix)):

```bash
npm install uploadthing @uploadthing/react
```

---

### Environment Variables

Add your UploadThing token to your `.env` file:

```bash
UPLOADTHING_TOKEN=sk_live_xxxxxxxxxxxx  # From UploadThing dashboard
```

Get your token from the [UploadThing Dashboard](https://uploadthing.com/dashboard).

---

### Server-Side Setup: Creating the File Router

For React Router v7, create a file router using `createUploadthing` from `uploadthing/remix`. This file serves as both your route handler and the type definition for your uploads.

**File:** `app/routes/api.uploadthing.ts`

```typescript
import { createRouteHandler, createUploadthing } from 'uploadthing/remix';
import { UploadThingError } from 'uploadthing/server';
import type { FileRouter } from 'uploadthing/types';

const f = createUploadthing();

// Authentication function - replace with Better Auth
const auth = async (event: { request: Request }) => {
  // TODO: Integrate Better Auth session validation
  // const session = await auth.api.getSession(request);
  // return session ? { id: session.userId } : null;
  return { id: 'fake-user-id' }; // Placeholder
};

export const uploadRouter = {
  // Profile image uploader
  profileImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      const user = await auth(event);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // file.ufsUrl contains the uploaded file URL
      console.log('Uploaded:', file.ufsUrl);
      return { url: file.ufsUrl };
    }),

  // Course thumbnail
  courseThumbnail: f({
    image: {
      maxFileSize: '2MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      const user = await auth(event);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),

  // Job thumbnail
  jobThumbnail: f({
    image: {
      maxFileSize: '2MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      const user = await auth(event);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

// Export types for client-side components
export type UploadRouter = typeof uploadRouter;

// Export the resource route handler
export const { loader, action } = createRouteHandler({
  router: uploadRouter,
  // Optional config:
  // config: {
  //   uploadthingSecret: process.env.UPLOADTHING_TOKEN,
  // },
});
```

The route exports both `loader` and `action` — the loader fetches configuration for the client, and the action handles file uploads.

**Evidence** ([UploadThing Remix Resource Route](https://docs.uploadthing.com/getting-started/remix)):

```typescript
export const { action, loader } = createRouteHandler({
  router: uploadRouter,
  // Apply an (optional) custom config:
  // config: { ... },
});
```

---

## 2. File Router Pattern: Upload Slots with Limits and Callbacks

### Route Configuration Options

Each file route accepts configuration specifying file types, size limits, and count limits:

```typescript
imageUploader: f({
  image: {
    maxFileSize: '4MB', // Default for image: 4MB
    maxFileCount: 4, // Default: 1
    minFileCount: 1, // Default: 1
    contentDisposition: 'inline', // or "attachment"
    acl: 'public-read', // Requires dashboard setting enabled
  },
});
```

**Supported file types:** `image`, `video`, `audio`, `pdf`, `text`, or any valid MIME type (e.g., `"image/png"`, `"application/pdf"`).

**Evidence** ([File Route Config](https://docs.uploadthing.com/file-routes)):

```typescript
export const uploadRouter = {
  profilePicture: f(['image'])
    .middleware(({ req }) => auth(req))
    .onUploadComplete((data) => console.log('file', data)),

  // Multiple file types
  messageAttachment: f(['image', 'video'])
    .middleware(({ req }) => auth(req))
    .onUploadComplete((data) => console.log('file', data)),

  // Strict configuration
  strictImageAttachment: f({
    image: { maxFileSize: '2MB', maxFileCount: 1, minFileCount: 1 },
  })
    .middleware(({ req }) => auth(req))
    .onUploadComplete((data) => console.log('file', data)),
} satisfies FileRouter;
```

### Callback Hooks

The `.middleware()` function runs before upload processing. Return metadata accessible in `onUploadComplete`:

```typescript
.middleware(async ({ event }) => {
  // Before upload
  const user = await auth(event);
  return { userId: user.id }; // Available in onUploadComplete
})
.onUploadComplete(async ({ metadata, file }) => {
  // After upload — metadata.userId is available here
  console.log("File URL:", file.ufsUrl);
  // file contains: { name, size, type, ufsUrl, customId, ... }
  return { uploadedBy: metadata.userId };
})
```

---

## 3. Client-Side Upload Components

### Creating Type-Safe Components

First, create a typed utility file for your upload components:

**File:** `app/utils/uploadthing.ts`

```typescript
import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from '@uploadthing/react';

import type { UploadRouter } from '../routes/api.uploadthing';

export const UploadButton = generateUploadButton<UploadRouter>();
export const UploadDropzone = generateUploadDropzone<UploadRouter>();
export const { useUploadThing } = generateReactHelpers<UploadRouter>();
```

**Evidence** ([UploadThing Remix Components](https://docs.uploadthing.com/getting-started/remix)):

```typescript
import {
  generateUploadButton,
  generateUploadDropzone,
} from '@uploadthing/react';

import type { UploadRouter } from '~/routes/api.uploadthing';

export const UploadButton = generateUploadButton<UploadRouter>();
export const UploadDropzone = generateUploadDropzone<UploadRouter>();
```

---

### Using the UploadButton

```tsx
import { UploadButton } from '../utils/uploadthing';

export function ProfileUploader() {
  return (
    <UploadButton
      endpoint="profileImage"
      onClientUploadComplete={(response) => {
        // response[0].ufsUrl contains the uploaded file URL
        console.log('Uploaded:', response[0].ufsUrl);
        // Save URL to database here using the response
      }}
      onUploadError={(error) => {
        console.error('Upload failed:', error.message);
      }}
    />
  );
}
```

---

### Using the UploadDropzone

```tsx
import { UploadDropzone } from '../utils/uploadthing';

export function CourseThumbnailUploader() {
  return (
    <UploadDropzone
      endpoint="courseThumbnail"
      onClientUploadComplete={(response) => {
        const url = response[0].ufsUrl;
        // Save to database via server action
      }}
      onUploadError={(error) => {
        console.error(error.message);
      }}
      // Optional appearance props
      appearance={{
        container: 'border-2 border-dashed border-gray-300 rounded-lg p-8',
        label: 'text-gray-500',
      }}
    />
  );
}
```

---

### Using the useUploadThing Hook (Custom Components)

For fully custom upload UI:

```tsx
import { useState, useCallback } from 'react';
import { useUploadThing } from '../utils/uploadthing';
import { useDropzone } from '@uploadthing/react';
import {
  generateClientDropzoneAccept,
  generatePermittedFileTypes,
} from 'uploadthing/client';

export function CustomUploader() {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { startUpload, routeConfig, isUploading } = useUploadThing(
    'profileImage',
    {
      onClientUploadComplete: (response) => {
        console.log('Complete:', response[0].ufsUrl);
      },
      onUploadError: (error) => {
        console.error('Error:', error.message);
      },
    },
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept(
      generatePermittedFileTypes(routeConfig).fileTypes,
    ),
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drop files here or click to select</p>
      {files.length > 0 && (
        <button onClick={() => startUpload(files)} disabled={isUploading}>
          {isUploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
        </button>
      )}
    </div>
  );
}
```

**Evidence** ([useUploadThing Hook](https://docs.uploadthing.com/api-reference/react#use-upload-thing)):

```typescript
const { startUpload, routeConfig } = useUploadThing('myUploadEndpoint', {
  onClientUploadComplete: () => {
    alert('uploaded successfully!');
  },
  onUploadError: () => {
    alert('error occurred while uploading');
  },
});
```

---

## 4. Getting the Uploaded URL

### From onClientUploadComplete Callback

The `onClientUploadComplete` callback receives an array of uploaded files:

```typescript
<UploadButton
  endpoint="profileImage"
  onClientUploadComplete={(files) => {
    // files[0].ufsUrl is the public URL
    const imageUrl = files[0].ufsUrl;
    console.log("Uploaded URL:", imageUrl);
  }}
  onUploadError={(error) => {
    console.error(error.message);
  }}
/>
```

### From onUploadComplete Callback (Server)

The server-side callback also provides the URL:

```typescript
.onUploadComplete(async ({ metadata, file }) => {
  // file.ufsUrl is available here
  const uploadedUrl = file.ufsUrl;

  // Save to database via Drizzle ORM
  await db.insert(userProfiles).values({
    userId: metadata.userId,
    avatarUrl: uploadedUrl,
  });

  return { uploadedBy: metadata.userId };
})
```

**Evidence** ([File Router onUploadComplete](https://docs.uploadthing.com/file-routes)):

```typescript
.onUploadComplete(async ({ metadata, file }) => {
  console.log("Upload complete for userId:", metadata.userId);
  console.log("file url", file.ufsUrl);
  return { uploadedBy: metadata.userId };
});
```

The uploaded file URL follows this pattern: `https://uploadthing.com/{appId}/{fileId}`.

---

## 5. Authentication Integration: Protecting Uploads

### Middleware Pattern

UploadThing middleware runs on your server before the upload. Throw `UploadThingError` to reject unauthenticated uploads:

```typescript
import { createUploadthing, UploadThingError } from 'uploadthing/remix';

const f = createUploadthing();

export const uploadRouter = {
  protectedUpload: f({
    image: { maxFileSize: '4MB' },
  })
    .middleware(async ({ event }) => {
      // Validate session from the request
      const session = await auth.api.getSession(event.request);

      if (!session) {
        throw new UploadThingError('You must be signed in to upload');
      }

      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save file association to database
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
```

**Evidence** ([Authentication & Security](https://docs.uploadthing.com/concepts/auth-security)):

```typescript
import { createUploadthing, UploadThingError } from 'uploadthing/server';

export const uploadRouter = {
  privateRoute: f({ image: {} })
    .middleware(async ({ req }) => {
      const session = await auth(req);
      if (!session) {
        throw new UploadThingError('You need to be logged in to upload files');
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(() => {
      /** ... */
    }),
};
```

### Integrating Better Auth

In your router, extract the Better Auth session from the request headers. The session cookie arrives in the request:

```typescript
const auth = async (event: { request: Request }) => {
  // Better Auth: parse session from cookie
  const cookieHeader = event.request.headers.get('cookie');
  // Or use your auth library's server-side function:
  // const session = await auth.api.getSession(event.request);
  // return session;
  return null;
};

export const uploadRouter = {
  profileImage: f({ image: { maxFileSize: '4MB' } })
    .middleware(async ({ event }) => {
      const user = await auth(event);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Save metadata to your database
    }),
};
```

The request object passed to middleware has a `request` property for parsing headers/cookies.

---

## 6. Best Practices for React Router v7 Framework Mode

### Adding the Route

In your routes configuration, add the upload endpoint:

**File:** `app/routes.ts`

```typescript
import { route, type RouteConfig } from '@react-router/dev/routes';

export default [
  // ... other routes
  route('api/uploadthing', 'routes/api.uploadthing.ts'),
] satisfies RouteConfig;
```

This creates the `/api/uploadthing` resource route.

---

### Server Actions for Database Updates

After upload completes, the client callback receives the file URL. Use a server action to save it to the database:

```typescript
// app/routes/profile.tsx
import { useState } from "react";
import { data, redirect } from "react-router";
import { UploadButton } from "../utils/uploadthing";
import { db } from "../db"; // Your Drizzle instance

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const avatarUrl = formData.get("avatarUrl") as string;

  // Get user session
  const session = await auth.api.getSession(request);

  await db.update(userProfiles)
    .set({ avatarUrl })
    .where(eq(userProfiles.userId, session.userId));

  return redirect("/profile");
}

export default function ProfilePage() {
  return (
    <form method="post" encType="multipart/form-data">
      <input type="hidden" name="avatarUrl" id="avatarUrl" />
      <UploadButton
        endpoint="profileImage"
        onClientUploadComplete={(files) => {
          const url = files[0].ufsUrl;
          // Set the hidden input value and submit
          document.getElementById("avatarUrl").value = url;
          // Or use submit() from react-router
        }}
      />
      <button type="submit">Save Profile</button>
    </form>
  );
}
```

---

### Tailwind Styling

Add UploadThing's Tailwind plugin for component styling:

**File:** `tailwind.config.ts`

```typescript
import { withUt } from 'uploadthing/tw';

export default withUt({
  content: ['./src/**/*.{ts,tsx}'],
  // ... your existing config
});
```

This includes styles for the prebuilt `UploadButton` and `UploadDropzone` components.

**Evidence** ([Theming](https://docs.uploadthing.com/concepts/theming#theming-with-tailwind-css)):

```typescript
import { withUt } from 'uploadthing/tw';

export default withUt({
  content: ['./src/**/*.{ts,tsx,mdx}'],
  // ...
});
```

---

### File Size and Image Optimization Defaults

Default limits by file type:

| File Type | Default maxFileSize | Customizable |
| --------- | ------------------- | ------------ |
| `image`   | 4MB                 | Yes          |
| `video`   | 16MB                | Yes          |
| `audio`   | 8MB                 | Yes          |
| `pdf`     | 4MB                 | Yes          |
| `text`    | 64KB                | Yes          |
| `blob`    | 8MB                 | Yes          |

UploadThing handles image optimization server-side after upload. Access optimized versions through the URL:

```typescript
// Original
file.ufsUrl
// With transformations (appends query params)
https://uploadthing.com/.../image.jpg?width=300&height=300&fit=cover
```

---

## Complete Example: poomwork Image Upload Router

```typescript
// app/routes/api.uploadthing.ts
import { createRouteHandler, createUploadthing } from 'uploadthing/remix';
import { UploadThingError } from 'uploadthing/server';
import type { FileRouter } from 'uploadthing/types';

const f = createUploadthing();

// Replace with your Better Auth setup
const authenticate = async (event: { request: Request }) => {
  // const session = await auth.api.getSession(event.request);
  // return session;
  return null;
};

export const uploadRouter = {
  // Profile photos
  profileImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      const session = await authenticate(event);
      if (!session) throw new UploadThingError('Sign in required');
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),

  // Course thumbnails (publicly viewable)
  courseThumbnail: f({
    image: {
      maxFileSize: '2MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      // Public uploads might skip auth or require creator role
      const session = await authenticate(event);
      if (!session) throw new UploadThingError('Sign in required');
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),

  // Job/freelance thumbnails
  jobThumbnail: f({
    image: {
      maxFileSize: '2MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ event }) => {
      const session = await authenticate(event);
      if (!session) throw new UploadThingError('Sign in required');
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),

  // Portfolio images (multiple)
  portfolioImages: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 10,
    },
  })
    .middleware(async ({ event }) => {
      const session = await authenticate(event);
      if (!session) throw new UploadThingError('Sign in required');
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),

  // Self-introduction video/image
  introMedia: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
    video: { maxFileSize: '16MB', maxFileCount: 1 },
  })
    .middleware(async ({ event }) => {
      const session = await authenticate(event);
      if (!session) throw new UploadThingError('Sign in required');
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
export const { loader, action } = createRouteHandler({ router: uploadRouter });
```

---

## Summary Checklist

| Step | Action                                                  |
| ---- | ------------------------------------------------------- |
| 1    | `npm install uploadthing @uploadthing/react`            |
| 2    | Add `UPLOADTHING_TOKEN` to `.env`                       |
| 3    | Create `app/routes/api.uploadthing.ts` with file router |
| 4    | Create `app/utils/uploadthing.ts` with typed helpers    |
| 5    | Add UploadThing Tailwind plugin to `tailwind.config.ts` |
| 6    | Add route to `app/routes.ts`                            |
| 7    | Integrate Better Auth in middleware                     |

---

## Key Takeaways

1. **Use `uploadthing/remix`** — not Next.js-specific packages. The Remix adapter works with React Router v7.
2. **Resource route at `/api/uploadthing`** — exports `loader` and `action` via `createRouteHandler`.
3. **Middleware for auth** — validate sessions in `.middleware()` and throw `UploadThingError` on failure.
4. **Type-safe components** — generate them using your `UploadRouter` type for full TypeScript support.
5. **`onUploadComplete` gives the URL** — use `file.ufsUrl` to save the uploaded file reference to Drizzle.
6. **Separate endpoints** — define different routes for profile images, thumbnails, portfolio items with specific size/type limits.
