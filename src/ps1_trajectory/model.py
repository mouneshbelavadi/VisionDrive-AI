import torch
import torch.nn as nn

class SocialLSTM(nn.Module):
    def __init__(self, input_size=2, hidden=64, pred_len=6, n_modes=3):
        super(SocialLSTM, self).__init__()
        self.pred_len = pred_len
        self.n_modes = n_modes
        
        self.embed = nn.Sequential(
            nn.Linear(input_size, hidden),
            nn.ReLU()
        )
        
        self.lstm = nn.LSTM(hidden, hidden, num_layers=2, batch_first=True)
        
        # Output: [B, n_modes * pred_len * 2]
        self.fc_out = nn.Linear(hidden, n_modes * pred_len * 2)
        # Confidence: [B, n_modes]
        self.fc_conf = nn.Sequential(
            nn.Linear(hidden, n_modes),
            nn.Softmax(dim=1)
        )
        
    def forward(self, x):
        # x: [B, 4, 2]
        batch_size = x.size(0)
        
        # Embedding
        x = self.embed(x)
        
        # LSTM
        _, (h_n, _) = self.lstm(x)
        # Take last hidden state: [B, hidden]
        h_last = h_n[-1]
        
        # Modes prediction
        modes = self.fc_out(h_last).view(batch_size, self.n_modes, self.pred_len, 2)
        # Confidence
        conf = self.fc_conf(h_last)
        
        return modes, conf
