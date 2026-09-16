const prisma = require("../db/prisma");

/**
 * Retrieves analytics for a requested user.
 * Users may view their own analytics.
 * Managers and admins may view analytics for other users.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function getUserAnalytics(req, res, next) {
  const requestedUserId = parseInt(req.params.id);
  const loggedInUserId = req.user.id;

  if (isNaN(requestedUserId)) {
    return res.status(400).json({
      error: "Invalid user ID",
    });
  }

  try {
    const isOwnAnalytics = requestedUserId === loggedInUserId;

    if (!isOwnAnalytics) {
      const loggedInUser = await prisma.user.findUnique({
        where: {
          id: loggedInUserId,
        },
        select: {
          role: true,
        },
      });

      if (!loggedInUser) {
        return res.status(404).json({
          message: "Logged-in user not found",
        });
      }

      const canViewOtherUsers =
        loggedInUser.role === "MANAGER" || loggedInUser.role === "ADMIN";

      if (!canViewOtherUsers) {
        return res.status(403).json({
          message: "403 Forbidden",
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: {
        id: requestedUserId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        Task: {
          where: {
            isCompleted: false,
          },
          select: {
            id: true,
            title: true,
            priority: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const taskStats = await prisma.task.groupBy({
      where: {
        userId: requestedUserId,
      },
      by: ["isCompleted"],
      _count: {
        id: true,
      },
    });

    const recentTasks = await prisma.task.findMany({
      where: {
        userId: requestedUserId,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return res.status(200).json({
      user,
      taskStats,
      recentTasks,
    });
  } catch (error) {
    return next(error);
  }
}

async function getUsersWithStats(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        message: "Invalid pagination parameters",
      });
    }

    const skip = (page - 1) * limit;

    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: {
            isCompleted: false,
          },
          select: {
            id: true,
          },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const totalUsers = await prisma.user.count();

    const pagination = {
      page,
      limit,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit),
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1,
    };

    return res.status(200).json({
      users,
      pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function searchTasks(req, res, next) {
  try {
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters long",
      });
    }

    const limit = parseInt(req.query.limit) || 20;

    const searchPattern = `%${searchQuery}%`;
    const exactMatch = searchQuery;
    const startsWith = `${searchQuery}%`;

    const results = await prisma.$queryRaw`
      SELECT
        t.id AS id,
        t.title AS title,
        t.is_completed AS "isCompleted",
        t.priority AS priority,
        t.created_at AS "createdAt",
        t.user_id AS "userId",
        u.name AS "user_name"
      FROM tasks t
      JOIN users u
        ON t.user_id = u.id
      WHERE
        t.title ILIKE ${searchPattern}
        OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    return res.status(200).json({
      results,
      query: searchQuery,
      count: results.length,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};
