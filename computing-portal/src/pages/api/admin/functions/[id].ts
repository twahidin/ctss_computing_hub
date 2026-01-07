import type { NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { Function, School } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;
  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: 'Invalid function ID' });
  }

  switch (method) {
    case 'GET':
      return handleGetFunction(req, res, id as string);
    case 'PUT':
      return handleUpdateFunction(req, res, id as string);
    case 'DELETE':
      return handleDeleteFunction(req, res, id as string);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetFunction(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const func = await Function.findById(id).lean();

    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }

    // If admin, check if their school has access to this function
    if (req.user.profile === 'admin' && req.user.schoolId) {
      const school = await School.findById(req.user.schoolId);
      if (school && !school.listAccessibleFunctions.includes(new mongoose.Types.ObjectId(id))) {
        return res.status(403).json({ message: 'Your school does not have access to this function' });
      }
    }

    return res.status(200).json({ function: func });
  } catch (error: any) {
    console.error('Get function error:', error);
    return res.status(500).json({ message: 'Failed to fetch function' });
  }
}

async function handleUpdateFunction(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const func = await Function.findById(id);

    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }

    // System functions can only be modified by super_admin
    if (func.isSystemFunction && req.user.profile !== 'super_admin') {
      return res.status(403).json({ message: 'Only super_admin can modify system functions' });
    }

    // If admin, check if their school has access to this function
    if (req.user.profile === 'admin' && req.user.schoolId) {
      const school = await School.findById(req.user.schoolId);
      if (school && !school.listAccessibleFunctions.includes(new mongoose.Types.ObjectId(id))) {
        return res.status(403).json({ message: 'Your school does not have access to this function' });
      }
    }

    const { 
      functionName, 
      functionCode, 
      functionData,
      profileFunctionList,
      isActive,
      isSystemFunction,
    } = req.body;

    const updateData: any = {};

    // Only super_admin can change name, code, profile list, active status, and system flag
    if (req.user.profile === 'super_admin') {
      if (functionName) updateData.functionName = functionName;
      if (functionCode) updateData.functionCode = functionCode.toUpperCase();
      if (profileFunctionList) updateData.profileFunctionList = profileFunctionList;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isSystemFunction !== undefined) updateData.isSystemFunction = isSystemFunction;
    }

    // Both admin and super_admin can update function data (settings, uploaded data)
    if (functionData) {
      // Merge with existing function data
      updateData.functionData = {
        ...func.functionData,
        ...functionData,
      };
      
      // If admin is adding uploaded data, track who uploaded it
      if (functionData.uploadedData && req.user.profile === 'admin') {
        const newUploadedData = functionData.uploadedData.map((item: any) => ({
          ...item,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
        }));
        
        // Append to existing uploaded data
        updateData.functionData.uploadedData = [
          ...(func.functionData?.uploadedData || []),
          ...newUploadedData,
        ];
      }
    }

    // Check for duplicate code if changing it
    if (updateData.functionCode) {
      const existingFunction = await Function.findOne({
        _id: { $ne: id },
        functionCode: updateData.functionCode,
      });

      if (existingFunction) {
        return res.status(400).json({ message: 'Function code already exists' });
      }
    }

    const updatedFunction = await Function.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: 'Function updated successfully',
      function: updatedFunction,
    });
  } catch (error: any) {
    console.error('Update function error:', error);
    return res.status(500).json({ message: 'Failed to update function' });
  }
}

async function handleDeleteFunction(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  // Only super_admin can delete functions
  if (req.user.profile !== 'super_admin') {
    return res.status(403).json({ message: 'Only super_admin can delete functions' });
  }

  try {
    const func = await Function.findById(id);

    if (!func) {
      return res.status(404).json({ message: 'Function not found' });
    }

    // Cannot delete system functions
    if (func.isSystemFunction) {
      return res.status(400).json({ message: 'Cannot delete system functions' });
    }

    // Remove function from all schools' accessible functions list
    await School.updateMany(
      { listAccessibleFunctions: id },
      { $pull: { listAccessibleFunctions: id } }
    );

    await Function.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Function deleted successfully' });
  } catch (error: any) {
    console.error('Delete function error:', error);
    return res.status(500).json({ message: 'Failed to delete function' });
  }
}

export default withMinProfile('admin')(handler);

