import cv2
import numpy as np

class IPMTransformer:
    def __init__(self, frame_shape, bev_size=(300, 300)):
        self.H, self.W = frame_shape[:2]
        self.bev_size = bev_size
        self.M = self._compute_homography()
        
    def _compute_homography(self):
        # Source trapezoid
        src_pts = np.float32([
            [self.W * 0.05, self.H],        # bottom-left
            [self.W * 0.95, self.H],        # bottom-right
            [self.W * 0.60, self.H * 0.55], # top-right
            [self.W * 0.40, self.H * 0.55]  # top-left
        ])
        
        # Destination rectangle
        dst_pts = np.float32([
            [0, self.bev_size[1]],
            [self.bev_size[0], self.bev_size[1]],
            [self.bev_size[0], 0],
            [0, 0]
        ])
        
        return cv2.getPerspectiveTransform(src_pts, dst_pts)
        
    def warp_frame(self, frame):
        return cv2.warpPerspective(frame, self.M, self.bev_size)
        
    def warp_mask(self, mask):
        return cv2.warpPerspective(mask, self.M, self.bev_size, flags=cv2.INTER_NEAREST)
        
    def build_occupancy_grid(self, bev_mask, detections):
        # Start with bev_mask as base
        grid = bev_mask.copy()
        
        for (x, y, w, h) in detections:
            # Bottom-center point in camera coords
            bc_pt = np.float32([[x + w/2, y + h]])
            # Transform to BEV
            # PerspectiveTransform expects an array of points [N, 1, 2]
            bc_pt_reshaped = bc_pt.reshape(-1, 1, 2)
            bev_pt = cv2.perspectiveTransform(bc_pt_reshaped, self.M)
            
            bx, by = bev_pt[0][0]
            if 0 <= bx < self.bev_size[0] and 0 <= by < self.bev_size[1]:
                cv2.circle(grid, (int(bx), int(by)), 8, 1, -1) # Draw filled circle
                
        return grid
