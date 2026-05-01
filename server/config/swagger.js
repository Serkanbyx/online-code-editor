import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const bearerSecurity = [{ bearerAuth: [] }];
const optionalBearerSecurity = [{ bearerAuth: [] }, {}];

const commonResponses = {
  400: { description: 'Validation or malformed request error.' },
  401: { description: 'Authentication is required or the token is invalid.' },
  403: { description: 'The authenticated user is not allowed to perform this action.' },
  404: { description: 'The requested resource was not found.' },
  429: { description: 'Too many requests.' },
  500: { description: 'Unexpected server error.' },
};

const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const paginationParams = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
  },
];

const jsonBody = (schemaRef, description) => ({
  required: true,
  description,
  content: {
    'application/json': {
      schema: { $ref: schemaRef },
    },
  },
});

const successResponse = (description) => ({ description });

const createOperation = ({
  tag,
  summary,
  description,
  auth = 'public',
  parameters = [],
  requestBody,
  success = 'Successful request.',
}) => {
  const operation = {
    tags: [tag],
    summary,
    description,
    parameters,
    requestBody,
    responses: {
      200: successResponse(success),
      ...commonResponses,
    },
  };

  if (auth === 'protected' || auth === 'admin') {
    operation.security = bearerSecurity;
  }

  if (auth === 'optional') {
    operation.security = optionalBearerSecurity;
  }

  return Object.fromEntries(Object.entries(operation).filter(([, value]) => value !== undefined));
};

const endpoints = [
  {
    method: 'get',
    path: '/api/health',
    tag: 'Health',
    summary: 'Check API health',
    success: 'Returns API status, environment, and timestamp.',
  },
  {
    method: 'post',
    path: '/api/auth/register',
    tag: 'Auth',
    summary: 'Register a new user',
    requestBody: jsonBody('#/components/schemas/RegisterRequest', 'User registration payload.'),
    success: 'Returns the created user and JWT.',
  },
  {
    method: 'post',
    path: '/api/auth/login',
    tag: 'Auth',
    summary: 'Login with email and password',
    requestBody: jsonBody('#/components/schemas/LoginRequest', 'User login credentials.'),
    success: 'Returns the authenticated user and JWT.',
  },
  {
    method: 'get',
    path: '/api/auth/me',
    tag: 'Auth',
    auth: 'protected',
    summary: 'Read the current user',
    success: 'Returns the authenticated user profile.',
  },
  {
    method: 'patch',
    path: '/api/auth/me',
    tag: 'Auth',
    auth: 'protected',
    summary: 'Update the current user profile',
    requestBody: jsonBody('#/components/schemas/ProfileUpdateRequest', 'Profile fields to update.'),
    success: 'Returns the updated user profile.',
  },
  {
    method: 'patch',
    path: '/api/auth/password',
    tag: 'Auth',
    auth: 'protected',
    summary: 'Change the current user password',
    requestBody: jsonBody('#/components/schemas/ChangePasswordRequest', 'Current and new password values.'),
    success: 'Confirms that the password was changed.',
  },
  {
    method: 'delete',
    path: '/api/auth/me',
    tag: 'Auth',
    auth: 'protected',
    summary: 'Delete the current account',
    requestBody: jsonBody('#/components/schemas/DeleteAccountRequest', 'Password confirmation payload.'),
    success: 'Confirms account deletion.',
  },
  {
    method: 'post',
    path: '/api/snippets',
    tag: 'Snippets',
    auth: 'protected',
    summary: 'Create a snippet',
    requestBody: jsonBody('#/components/schemas/SnippetCreateRequest', 'Snippet content and visibility settings.'),
    success: 'Returns the created snippet.',
  },
  {
    method: 'get',
    path: '/api/snippets/me',
    tag: 'Snippets',
    auth: 'protected',
    summary: 'List current user snippets',
    parameters: paginationParams,
    success: 'Returns paginated snippets owned by the current user.',
  },
  {
    method: 'get',
    path: '/api/snippets/public',
    tag: 'Snippets',
    auth: 'optional',
    summary: 'Explore public snippets',
    parameters: [
      ...paginationParams,
      { name: 'search', in: 'query', schema: { type: 'string' } },
      { name: 'language', in: 'query', schema: { type: 'string' } },
      { name: 'tag', in: 'query', schema: { type: 'string' } },
      { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'popular'] } },
    ],
    success: 'Returns public active snippets with filters.',
  },
  {
    method: 'post',
    path: '/api/snippets/{id}/fork',
    tag: 'Snippets',
    auth: 'protected',
    summary: 'Fork a visible snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    success: 'Returns the forked snippet copy.',
  },
  {
    method: 'get',
    path: '/api/snippets/{id}',
    tag: 'Snippets',
    auth: 'optional',
    summary: 'Read a visible snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    success: 'Returns the requested snippet.',
  },
  {
    method: 'patch',
    path: '/api/snippets/{id}',
    tag: 'Snippets',
    auth: 'protected',
    summary: 'Update a snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    requestBody: jsonBody('#/components/schemas/SnippetUpdateRequest', 'Snippet fields to update.'),
    success: 'Returns the updated snippet.',
  },
  {
    method: 'delete',
    path: '/api/snippets/{id}',
    tag: 'Snippets',
    auth: 'protected',
    summary: 'Delete a snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    success: 'Confirms snippet deletion.',
  },
  {
    method: 'get',
    path: '/api/comments/snippet/{snippetId}',
    tag: 'Comments',
    auth: 'optional',
    summary: 'List snippet comments',
    parameters: [idParam('snippetId', 'Snippet ID.'), ...paginationParams],
    success: 'Returns top-level comments for a snippet.',
  },
  {
    method: 'get',
    path: '/api/comments/{commentId}/replies',
    tag: 'Comments',
    auth: 'optional',
    summary: 'List comment replies',
    parameters: [idParam('commentId', 'Comment ID.'), ...paginationParams],
    success: 'Returns replies for a comment.',
  },
  {
    method: 'post',
    path: '/api/comments',
    tag: 'Comments',
    auth: 'protected',
    summary: 'Create a comment or reply',
    requestBody: jsonBody('#/components/schemas/CommentCreateRequest', 'Comment payload.'),
    success: 'Returns the created comment.',
  },
  {
    method: 'patch',
    path: '/api/comments/{id}',
    tag: 'Comments',
    auth: 'protected',
    summary: 'Update a comment',
    parameters: [idParam('id', 'Comment ID.')],
    requestBody: jsonBody('#/components/schemas/CommentUpdateRequest', 'Updated comment content.'),
    success: 'Returns the updated comment.',
  },
  {
    method: 'delete',
    path: '/api/comments/{id}',
    tag: 'Comments',
    auth: 'protected',
    summary: 'Soft-delete a comment',
    parameters: [idParam('id', 'Comment ID.')],
    success: 'Confirms comment deletion.',
  },
  {
    method: 'post',
    path: '/api/likes/{snippetId}',
    tag: 'Likes',
    auth: 'protected',
    summary: 'Toggle a snippet like',
    parameters: [idParam('snippetId', 'Snippet ID.')],
    success: 'Returns the updated like state.',
  },
  {
    method: 'get',
    path: '/api/likes/me',
    tag: 'Likes',
    auth: 'protected',
    summary: 'List current user likes',
    parameters: paginationParams,
    success: 'Returns paginated liked snippets.',
  },
  {
    method: 'get',
    path: '/api/likes/{snippetId}/me',
    tag: 'Likes',
    auth: 'protected',
    summary: 'Check current user like state',
    parameters: [idParam('snippetId', 'Snippet ID.')],
    success: 'Returns whether the current user liked the snippet.',
  },
  {
    method: 'post',
    path: '/api/rooms',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Create a collaboration room',
    requestBody: jsonBody('#/components/schemas/RoomCreateRequest', 'Room settings.'),
    success: 'Returns the created room.',
  },
  {
    method: 'get',
    path: '/api/rooms/me',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'List current user rooms',
    parameters: paginationParams,
    success: 'Returns owned or joined rooms.',
  },
  {
    method: 'get',
    path: '/api/rooms/{roomId}',
    tag: 'Rooms',
    auth: 'optional',
    summary: 'Read an accessible room',
    parameters: [idParam('roomId', 'Room ID.')],
    success: 'Returns the room when visible or accessible.',
  },
  {
    method: 'post',
    path: '/api/rooms/{roomId}/join',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Join a room',
    parameters: [idParam('roomId', 'Room ID.')],
    success: 'Returns the joined room.',
  },
  {
    method: 'post',
    path: '/api/rooms/{roomId}/leave',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Leave a room',
    parameters: [idParam('roomId', 'Room ID.')],
    success: 'Confirms that the user left the room.',
  },
  {
    method: 'post',
    path: '/api/rooms/{roomId}/participants',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Add a room participant',
    parameters: [idParam('roomId', 'Room ID.')],
    requestBody: jsonBody('#/components/schemas/AddParticipantRequest', 'Participant username payload.'),
    success: 'Returns the updated participant list.',
  },
  {
    method: 'patch',
    path: '/api/rooms/{roomId}',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Update a room',
    parameters: [idParam('roomId', 'Room ID.')],
    requestBody: jsonBody('#/components/schemas/RoomUpdateRequest', 'Room fields to update.'),
    success: 'Returns the updated room.',
  },
  {
    method: 'delete',
    path: '/api/rooms/{roomId}',
    tag: 'Rooms',
    auth: 'protected',
    summary: 'Delete a room',
    parameters: [idParam('roomId', 'Room ID.')],
    success: 'Confirms room deletion.',
  },
  {
    method: 'get',
    path: '/api/code/runtimes',
    tag: 'Code',
    auth: 'optional',
    summary: 'List supported runtimes',
    success: 'Returns supported Piston runtimes.',
  },
  {
    method: 'post',
    path: '/api/code/run',
    tag: 'Code',
    auth: 'protected',
    summary: 'Execute code',
    requestBody: jsonBody('#/components/schemas/RunCodeRequest', 'Code execution payload.'),
    success: 'Returns execution output from the Piston proxy.',
  },
  {
    method: 'post',
    path: '/api/upload/avatar',
    tag: 'Uploads',
    auth: 'protected',
    summary: 'Upload an avatar',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: { $ref: '#/components/schemas/AvatarUploadRequest' },
        },
      },
    },
    success: 'Returns the uploaded avatar URL.',
  },
  {
    method: 'patch',
    path: '/api/profile/me/preferences',
    tag: 'Profiles',
    auth: 'protected',
    summary: 'Update profile preferences',
    requestBody: jsonBody('#/components/schemas/PreferencesUpdateRequest', 'Profile preference values.'),
    success: 'Returns updated preferences.',
  },
  {
    method: 'get',
    path: '/api/profile/{username}',
    tag: 'Profiles',
    auth: 'optional',
    summary: 'Read a public profile',
    parameters: [idParam('username', 'Username.')],
    success: 'Returns public profile data.',
  },
  {
    method: 'get',
    path: '/api/profile/{username}/snippets',
    tag: 'Profiles',
    auth: 'optional',
    summary: 'List profile snippets',
    parameters: [idParam('username', 'Username.'), ...paginationParams],
    success: 'Returns public snippets for the profile.',
  },
  {
    method: 'get',
    path: '/api/profile/{username}/likes',
    tag: 'Profiles',
    auth: 'optional',
    summary: 'List visible profile likes',
    parameters: [idParam('username', 'Username.'), ...paginationParams],
    success: 'Returns visible liked snippets for the profile.',
  },
  {
    method: 'get',
    path: '/api/profile/{username}/comments',
    tag: 'Profiles',
    auth: 'optional',
    summary: 'List visible profile comments',
    parameters: [idParam('username', 'Username.'), ...paginationParams],
    success: 'Returns visible comments for the profile.',
  },
  {
    method: 'post',
    path: '/api/reports',
    tag: 'Reports',
    auth: 'protected',
    summary: 'Create a moderation report',
    requestBody: jsonBody('#/components/schemas/ReportCreateRequest', 'Report target and reason.'),
    success: 'Returns the created report.',
  },
  {
    method: 'get',
    path: '/api/reports/me',
    tag: 'Reports',
    auth: 'protected',
    summary: 'List current user reports',
    parameters: paginationParams,
    success: 'Returns reports filed by the current user.',
  },
  {
    method: 'get',
    path: '/api/admin/stats',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Read dashboard stats',
    success: 'Returns aggregate admin dashboard metrics.',
  },
  {
    method: 'get',
    path: '/api/admin/users',
    tag: 'Admin',
    auth: 'admin',
    summary: 'List users',
    parameters: [...paginationParams, { name: 'search', in: 'query', schema: { type: 'string' } }],
    success: 'Returns users for admin management.',
  },
  {
    method: 'get',
    path: '/api/admin/users/{id}',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Read user details',
    parameters: [idParam('id', 'User ID.')],
    success: 'Returns admin user details.',
  },
  {
    method: 'patch',
    path: '/api/admin/users/{id}/role',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Update user role',
    parameters: [idParam('id', 'User ID.')],
    requestBody: jsonBody('#/components/schemas/RoleUpdateRequest', 'New role value.'),
    success: 'Returns the updated user.',
  },
  {
    method: 'patch',
    path: '/api/admin/users/{id}/ban',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Ban or unban a user',
    parameters: [idParam('id', 'User ID.')],
    requestBody: jsonBody('#/components/schemas/BanUserRequest', 'Ban state payload.'),
    success: 'Returns the updated user.',
  },
  {
    method: 'delete',
    path: '/api/admin/users/{id}',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Delete a user',
    parameters: [idParam('id', 'User ID.')],
    success: 'Confirms user deletion.',
  },
  {
    method: 'get',
    path: '/api/admin/snippets',
    tag: 'Admin',
    auth: 'admin',
    summary: 'List snippets for moderation',
    parameters: [...paginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }],
    success: 'Returns snippets for moderation.',
  },
  {
    method: 'patch',
    path: '/api/admin/snippets/{id}/status',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Moderate a snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    requestBody: jsonBody('#/components/schemas/ModerationStatusRequest', 'Moderation status payload.'),
    success: 'Returns the moderated snippet.',
  },
  {
    method: 'delete',
    path: '/api/admin/snippets/{id}',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Hard-delete a snippet',
    parameters: [idParam('id', 'Snippet ID.')],
    success: 'Confirms snippet deletion.',
  },
  {
    method: 'get',
    path: '/api/admin/comments',
    tag: 'Admin',
    auth: 'admin',
    summary: 'List comments for moderation',
    parameters: [...paginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }],
    success: 'Returns comments for moderation.',
  },
  {
    method: 'patch',
    path: '/api/admin/comments/{id}/status',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Moderate a comment',
    parameters: [idParam('id', 'Comment ID.')],
    requestBody: jsonBody('#/components/schemas/ModerationStatusRequest', 'Moderation status payload.'),
    success: 'Returns the moderated comment.',
  },
  {
    method: 'get',
    path: '/api/admin/reports',
    tag: 'Admin',
    auth: 'admin',
    summary: 'List moderation reports',
    parameters: [...paginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }],
    success: 'Returns report queue items.',
  },
  {
    method: 'patch',
    path: '/api/admin/reports/{id}',
    tag: 'Admin',
    auth: 'admin',
    summary: 'Resolve or dismiss a report',
    parameters: [idParam('id', 'Report ID.')],
    requestBody: jsonBody('#/components/schemas/ResolveReportRequest', 'Report resolution payload.'),
    success: 'Returns the updated report.',
  },
];

const paths = endpoints.reduce((accumulator, endpoint) => {
  const { method, path, ...operationConfig } = endpoint;
  accumulator[path] = accumulator[path] || {};
  accumulator[path][method] = createOperation(operationConfig);

  return accumulator;
}, {});

export const swaggerSpec = {
  openapi: '3.1.0',
  info: {
    title: 'CodeNest API',
    version,
    description: 'REST API for CodeNest, a realtime online code editor with snippets, rooms, code execution, profiles, and moderation tools.',
    contact: {
      name: 'Serkanby',
      url: 'https://serkanbayraktar.com/',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Operational status endpoints.' },
    { name: 'Auth', description: 'Authentication and account endpoints.' },
    { name: 'Snippets', description: 'Snippet creation, discovery, and management.' },
    { name: 'Comments', description: 'Snippet comments and replies.' },
    { name: 'Likes', description: 'Snippet like state endpoints.' },
    { name: 'Rooms', description: 'Realtime collaboration room endpoints.' },
    { name: 'Code', description: 'Piston runtime and execution proxy endpoints.' },
    { name: 'Uploads', description: 'File upload endpoints.' },
    { name: 'Profiles', description: 'Public profile and preference endpoints.' },
    { name: 'Reports', description: 'User moderation reports.' },
    { name: 'Admin', description: 'Admin-only moderation and management endpoints.' },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 30, example: 'serkanby' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'StrongPass123!' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', example: 'StrongPass123!' },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 60 },
          bio: { type: 'string', maxLength: 240 },
          avatarUrl: { type: 'string', format: 'uri' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      DeleteAccountRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', format: 'password' },
        },
      },
      SnippetCreateRequest: {
        type: 'object',
        required: ['title', 'language', 'code'],
        properties: {
          title: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          language: { type: 'string', example: 'javascript' },
          code: { type: 'string', example: 'console.log("Hello CodeNest");' },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          isPublic: { type: 'boolean', default: false },
        },
      },
      SnippetUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          language: { type: 'string' },
          code: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          isPublic: { type: 'boolean' },
        },
      },
      CommentCreateRequest: {
        type: 'object',
        required: ['snippetId', 'content'],
        properties: {
          snippetId: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          content: { type: 'string', maxLength: 1000 },
        },
      },
      CommentUpdateRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', maxLength: 1000 },
        },
      },
      RoomCreateRequest: {
        type: 'object',
        required: ['name', 'language'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          language: { type: 'string', example: 'javascript' },
          isPublic: { type: 'boolean', default: false },
        },
      },
      RoomUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100 },
          language: { type: 'string' },
          isPublic: { type: 'boolean' },
        },
      },
      AddParticipantRequest: {
        type: 'object',
        required: ['username'],
        properties: {
          username: { type: 'string' },
        },
      },
      RunCodeRequest: {
        type: 'object',
        required: ['language', 'code'],
        properties: {
          language: { type: 'string', example: 'javascript' },
          version: { type: 'string', example: 'latest' },
          code: { type: 'string', example: 'console.log("Hello");' },
          stdin: { type: 'string', default: '' },
        },
      },
      AvatarUploadRequest: {
        type: 'object',
        required: ['avatar'],
        properties: {
          avatar: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      PreferencesUpdateRequest: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'system'] },
          editor: {
            type: 'object',
            additionalProperties: true,
          },
          privacy: {
            type: 'object',
            properties: {
              showEmail: { type: 'boolean' },
              showLikes: { type: 'boolean' },
              showComments: { type: 'boolean' },
            },
          },
          notifications: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      ReportCreateRequest: {
        type: 'object',
        required: ['targetType', 'targetId', 'reason'],
        properties: {
          targetType: { type: 'string', enum: ['snippet', 'comment'] },
          targetId: { type: 'string' },
          reason: { type: 'string', maxLength: 120 },
          details: { type: 'string', maxLength: 1000 },
        },
      },
      RoleUpdateRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
      BanUserRequest: {
        type: 'object',
        required: ['isBanned'],
        properties: {
          isBanned: { type: 'boolean' },
        },
      },
      ModerationStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'hidden', 'removed'] },
        },
      },
      ResolveReportRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['resolved', 'dismissed'] },
          resolutionNote: { type: 'string', maxLength: 1000 },
        },
      },
    },
  },
};

export const swaggerUiOptions = {
  customSiteTitle: 'CodeNest API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
};
